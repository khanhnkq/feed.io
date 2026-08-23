from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import APIRouter, Depends, status

from feedio.modules.identity.domain.models import CurrentUser
from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.organizations.application.create import CreateOrganization
from feedio.modules.organizations.presentation.schemas import (
    CreateOrganizationRequest,
    OrganizationResponse,
)

CreateOrganizationProvider = Callable[
    ...,
    CreateOrganization | Awaitable[CreateOrganization],
]
CurrentUserProvider = Callable[..., CurrentUser | Awaitable[CurrentUser]]


def create_organizations_router(
    create_organization_provider: CreateOrganizationProvider,
    current_user_provider: CurrentUserProvider,
) -> APIRouter:
    router = APIRouter(prefix="/organizations", tags=["organizations"])

    @router.post("", status_code=status.HTTP_201_CREATED, operation_id="create_organization")
    async def create_organization(
        body: CreateOrganizationRequest,
        use_case: Annotated[CreateOrganization, Depends(create_organization_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> OrganizationResponse:
        organization = await use_case.execute(current_user.id, body.name)
        return OrganizationResponse.from_domain(organization)

    return router
