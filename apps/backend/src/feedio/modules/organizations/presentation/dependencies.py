from collections.abc import Awaitable, Callable
from typing import Annotated, Any
from uuid import UUID

from fastapi import Depends, HTTPException, status

from feedio.modules.identity.domain.value_objects import CurrentUser
from feedio.modules.organizations.application.access import AuthorizeOrganization
from feedio.modules.organizations.application.ports import OrganizationAccessRepository
from feedio.modules.organizations.domain.errors import OrganizationAccessDeniedError
from feedio.modules.organizations.domain.value_objects import OrganizationContext

CurrentUserProvider = Callable[..., CurrentUser | Awaitable[CurrentUser]]
AccessRepositoryProvider = Callable[
    ...,
    OrganizationAccessRepository | Awaitable[OrganizationAccessRepository],
]


def create_organization_context_dependency(
    current_user_provider: CurrentUserProvider,
    access_repository_provider: AccessRepositoryProvider,
    auth_cache: Any | None = None,
) -> Callable[..., Awaitable[OrganizationContext]]:
    async def organization_context(
        organization_id: UUID,
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        repository: Annotated[
            OrganizationAccessRepository,
            Depends(access_repository_provider),
        ],
    ) -> OrganizationContext:
        if auth_cache is not None:
            cached: OrganizationContext | None = await auth_cache.get_org_context(
                organization_id, current_user.id
            )
            if cached is not None:
                return cached
        try:
            context = await AuthorizeOrganization(repository).execute(
                organization_id,
                current_user.id,
            )
        except OrganizationAccessDeniedError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Organization access denied") from error
        if auth_cache is not None:
            await auth_cache.set_org_context(context)
        return context

    return organization_context
