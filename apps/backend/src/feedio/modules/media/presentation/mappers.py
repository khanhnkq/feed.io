from feedio.modules.media.application.ports import StorageService
from feedio.modules.media.domain.entities import MediaAsset
from feedio.modules.media.presentation.schemas import MediaResponse


async def to_media_response(
    media: MediaAsset,
    storage: StorageService | None = None,
) -> MediaResponse:
    thumbnail_url: str | None = None
    hls_stream_url: str | None = None
    proxy_url: str | None = None
    filmstrip_url: str | None = None
    filmstrip_vtt_url: str | None = None
    stream_url: str | None = None

    if storage:
        stream_url = await storage.generate_presigned_view_url(
            storage_key=media.storage_key,
            expires_in=7200,
        )
        if media.thumbnail_storage_key:
            thumbnail_url = await storage.generate_presigned_view_url(
                storage_key=media.thumbnail_storage_key,
                expires_in=7200,
            )
        if media.hls_storage_key:
            hls_stream_url = await storage.generate_presigned_view_url(
                storage_key=media.hls_storage_key,
                expires_in=7200,
            )
        if media.proxy_storage_key:
            proxy_url = await storage.generate_presigned_view_url(
                storage_key=media.proxy_storage_key,
                expires_in=7200,
            )
        if media.filmstrip_storage_key:
            filmstrip_url = await storage.generate_presigned_view_url(
                storage_key=media.filmstrip_storage_key,
                expires_in=7200,
            )
        if media.filmstrip_vtt_storage_key:
            filmstrip_vtt_url = await storage.generate_presigned_view_url(
                storage_key=media.filmstrip_vtt_storage_key,
                expires_in=7200,
            )
        # For images/SVGs, the stream_url acts as the high-res thumbnail if no explicit thumbnail key exists
        if not thumbnail_url and media.mime_type.lower().startswith("image/"):
            thumbnail_url = stream_url

    return MediaResponse(
        id=media.id,
        organization_id=media.organization_id,
        project_id=media.project_id,
        folder_id=media.folder_id,
        created_by_user_id=media.created_by_user_id,
        title=media.title,
        filename=media.filename,
        file_size_bytes=media.file_size_bytes,
        mime_type=media.mime_type,
        storage_key=media.storage_key,
        thumbnail_storage_key=media.thumbnail_storage_key,
        thumbnail_url=thumbnail_url,
        hls_storage_key=media.hls_storage_key,
        hls_stream_url=hls_stream_url,
        proxy_storage_key=media.proxy_storage_key,
        proxy_url=proxy_url,
        filmstrip_storage_key=media.filmstrip_storage_key,
        filmstrip_url=filmstrip_url,
        filmstrip_vtt_storage_key=media.filmstrip_vtt_storage_key,
        filmstrip_vtt_url=filmstrip_vtt_url,
        stream_url=stream_url,
        waveform_data=media.waveform_data,
        status=media.status,
        duration_seconds=media.duration_seconds,
        width=media.width,
        height=media.height,
        fps=media.fps,
        error_message=media.error_message,
        version_group_id=media.version_group_id,
        version_number=media.version_number,
        created_at=media.created_at,
        updated_at=media.updated_at,
    )
