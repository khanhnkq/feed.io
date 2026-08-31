from dataclasses import dataclass
from uuid import UUID

from feedio.modules.media.application.ports import MediaRepository, StorageService
from feedio.modules.media.domain.errors import MediaNotFoundError


@dataclass(frozen=True, slots=True)
class PartPresignedUrl:
    part_number: int
    upload_url: str


class PresignMultipartParts:
    def __init__(
        self,
        repository: MediaRepository,
        storage: StorageService,
    ) -> None:
        self._repository = repository
        self._storage = storage

    async def execute(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        upload_id: str,
        part_numbers: list[int],
    ) -> list[PartPresignedUrl]:
        media = await self._repository.get_by_id(
            organization_id=organization_id,
            project_id=project_id,
            media_id=media_id,
        )
        if not media:
            raise MediaNotFoundError("Media asset not found")

        # Validate part numbers (S3 allows 1..10000)
        valid_part_numbers = [p for p in part_numbers if 1 <= p <= 10000]
        if not valid_part_numbers:
            return []

        results: list[PartPresignedUrl] = []
        for part_number in valid_part_numbers:
            url = await self._storage.generate_presigned_part_url(
                storage_key=media.storage_key,
                upload_id=upload_id,
                part_number=part_number,
                expires_in=3600,
            )
            results.append(PartPresignedUrl(part_number=part_number, upload_url=url))

        return results
