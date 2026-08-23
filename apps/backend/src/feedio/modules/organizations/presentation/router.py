from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from feedio.modules.identity.domain.models import CurrentUser
from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.organizations.application.create import CreateOrganization
from feedio.modules.organizations.application.get_by_slug import GetOrganizationBySlug
from feedio.modules.organizations.application.list_user_organizations import ListUserOrganizations
from feedio.modules.organizations.presentation.schemas import (
    CreateOrganizationRequest,
    OrganizationResponse,
)

CreateOrganizationProvider = Callable[
    ...,
    CreateOrganization | Awaitable[CreateOrganization],
]
ListOrganizationsProvider = Callable[
    ...,
    ListUserOrganizations | Awaitable[ListUserOrganizations],
]
GetBySlugProvider = Callable[
    ...,
    GetOrganizationBySlug | None | Awaitable[GetOrganizationBySlug | None],
]
CurrentUserProvider = Callable[..., CurrentUser | Awaitable[CurrentUser]]


def create_organizations_router(
    create_organization_provider: CreateOrganizationProvider,
    list_organizations_provider: ListOrganizationsProvider,
    current_user_provider: CurrentUserProvider,
    get_by_slug_provider: GetBySlugProvider | None = None,
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

    @router.get("", operation_id="list_organizations")
    async def list_organizations(
        list_use_case: Annotated[ListUserOrganizations, Depends(list_organizations_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
    ) -> list[OrganizationResponse]:
        organizations = await list_use_case.execute(current_user.id)
        return [OrganizationResponse.from_domain(item) for item in organizations]

    slug_provider = get_by_slug_provider or (lambda: None)

    @router.get("/by-slug/{slug}", operation_id="get_organization_by_slug")
    async def get_organization_by_slug(
        slug: str,
        get_slug_use_case: Annotated[GetOrganizationBySlug | None, Depends(slug_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
    ) -> OrganizationResponse:
        if get_slug_use_case is None:
            raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Not implemented")
        organization = await get_slug_use_case.execute(slug, current_user.id)
        if organization is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
        return OrganizationResponse.from_domain(organization)

    return router
