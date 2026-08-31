import json
from uuid import UUID

import structlog

from feedio.modules.media.application.ports import MediaRepository
from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.domain.errors import MediaNotFoundError
from feedio.modules.media.infrastructure.transcoder import FFmpegTranscoder

logger = structlog.get_logger()


class ProcessMediaTranscode:
    def __init__(
        self,
        repository: MediaRepository,
        transcoder: FFmpegTranscoder,
        valkey_client: object | None = None,
    ) -> None:
        self._repository = repository
        self._transcoder = transcoder
        self._valkey_client = valkey_client

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        storage_key: str,
        filename: str,
        mime_type: str,
    ) -> MediaAsset:
        media = await self._repository.get_by_id(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
        )
        if not media:
            raise MediaNotFoundError("Media asset not found")

        # Mark as processing
        await self._repository.update_status(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
            status="processing",
        )

        async def _update_progress(percent: int, stage: str) -> None:
            if self._valkey_client and hasattr(self._valkey_client, "set"):
                try:
                    key = f"transcode:progress:{media_id}"
                    payload = json.dumps(
                        {
                            "media_id": str(media_id),
                            "progress_percent": percent,
                            "current_stage": stage,
                            "status": "processing" if percent < 100 else "ready",
                        }
                    )
                    await self._valkey_client.set(key, payload, ex=3600)
                except Exception as valkey_exc:
                    logger.warn("valkey_progress_update_failed", error=str(valkey_exc))

        try:
            result = await self._transcoder.transcode(
                storage_key=storage_key,
                filename=filename,
                mime_type=mime_type,
                on_progress=_update_progress,
            )

            updated = await self._repository.update_transcode_result(
                organization_id=organization_id,
                project_id=project_id,
                media_id=media_id,
                status="ready",
                duration_seconds=result.duration_seconds,
                width=result.width,
                height=result.height,
                fps=result.fps,
                thumbnail_storage_key=result.thumbnail_storage_key
                or media.thumbnail_storage_key,
                hls_storage_key=result.hls_storage_key,
                proxy_storage_key=result.proxy_storage_key,
                filmstrip_storage_key=result.filmstrip_storage_key,
                filmstrip_vtt_storage_key=result.filmstrip_vtt_storage_key,
                waveform_data=result.waveform_data,
            )
            logger.info(
                "media_transcode_completed",
                media_id=str(media_id),
                fps=result.fps,
                has_hls=bool(result.hls_storage_key),
                has_proxy=bool(result.proxy_storage_key),
                has_filmstrip=bool(result.filmstrip_storage_key),
            )
            return updated
        except Exception as exc:
            logger.error(
                "media_transcode_failed",
                media_id=str(media_id),
                error=str(exc),
            )
            if self._valkey_client and hasattr(self._valkey_client, "set"):
                try:
                    key = f"transcode:progress:{media_id}"
                    payload = json.dumps(
                        {
                            "media_id": str(media_id),
                            "progress_percent": 0,
                            "current_stage": "error",
                            "status": "failed",
                            "error": str(exc),
                        }
                    )
                    await self._valkey_client.set(key, payload, ex=3600)
                except Exception:
                    pass

            failed = await self._repository.update_transcode_result(
                organization_id=organization_id,
                project_id=project_id,
                media_id=media_id,
                status="failed",
                error_message=str(exc),
            )
            return failed
