from collections.abc import Awaitable, Callable
from typing import Annotated
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
) -> Callable[..., Awaitable[OrganizationContext]]:
    async def organization_context(
        organization_id: UUID,
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        repository: Annotated[
            OrganizationAccessRepository,
            Depends(access_repository_provider),
        ],
    ) -> OrganizationContext:
        try:
            return await AuthorizeOrganization(repository).execute(
                organization_id,
                current_user.id,
            )
        except OrganizationAccessDeniedError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Organization access denied") from error

    return organization_context
