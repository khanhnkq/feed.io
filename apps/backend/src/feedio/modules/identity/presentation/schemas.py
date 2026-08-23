from uuid import UUID

from pydantic import BaseModel

from feedio.modules.identity.domain.models import CurrentUser


class CurrentUserResponse(BaseModel):
    id: UUID
    email: str
    display_name: str

    @classmethod
    def from_domain(cls, user: CurrentUser) -> "CurrentUserResponse":
        return cls(id=user.id, email=user.email, display_name=user.display_name)
