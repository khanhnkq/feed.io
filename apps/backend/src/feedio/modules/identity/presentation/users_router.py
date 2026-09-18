from collections.abc import Awaitable, Callable
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status

from feedio.modules.collaboration.application.ports import RealtimeEventPublisher
from feedio.modules.identity.application.service import AuthService
from feedio.modules.identity.domain.errors import InvalidCurrentPasswordError
from feedio.modules.identity.domain.value_objects import CurrentUser
from feedio.modules.identity.presentation.router import _require_csrf
from feedio.modules.identity.presentation.schemas import ChangePasswordRequest, SessionResponse
from feedio.shared.presentation.pagination import PaginatedResponse

AuthServiceProvider = Callable[..., AuthService | Awaitable[AuthService]]
CurrentUserProvider = Callable[..., CurrentUser | Awaitable[CurrentUser]]
EventPublisherProvider = Callable[..., RealtimeEventPublisher | Awaitable[RealtimeEventPublisher]]


def create_users_router(
    *,
    auth_service_provider: AuthServiceProvider,
    current_user_provider: CurrentUserProvider,
    event_publisher_provider: EventPublisherProvider | None = None,
) -> APIRouter:
    router = APIRouter(prefix="/users")

    @router.post(
        "/me/change-password",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="change_password",
        tags=["user-security"],
    )
    async def change_password(
        body: ChangePasswordRequest,
        service: Annotated[AuthService, Depends(auth_service_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
    ) -> None:
        try:
            await service.change_password(
                user_id=current_user.id,
                current_password=body.current_password,
                new_password=body.new_password,
                current_session_id=current_user.session_id,
                revoke_other_sessions=body.revoke_other_sessions,
            )
        except InvalidCurrentPasswordError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error

    @router.get(
        "/me/sessions",
        operation_id="list_user_sessions",
        tags=["user-security"],
    )
    async def list_user_sessions(
        service: Annotated[AuthService, Depends(auth_service_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        cursor: Annotated[str | None, Query(description="Cursor for pagination")] = None,
        limit: Annotated[int, Query(ge=1, le=100, description="Page size limit")] = 50,
    ) -> PaginatedResponse[SessionResponse]:
        sessions = await service.list_sessions(current_user.id)
        items = [
            SessionResponse(
                id=session.id,
                user_agent=session.user_agent,
                ip_address=session.ip_address,
                current=session.id == current_user.session_id,
            )
            for session in sessions
        ]
        return PaginatedResponse(items=items, next_cursor=None, has_more=False)

    @router.delete(
        "/me/sessions/{session_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="revoke_user_session",
        tags=["user-security"],
    )
    async def revoke_user_session(
        session_id: UUID,
        request: Request,
        service: Annotated[AuthService, Depends(auth_service_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        event_publisher: Annotated[
            RealtimeEventPublisher | None,
            Depends(event_publisher_provider or (lambda: None)),
        ] = None,
        csrf_header: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
    ) -> None:
        _require_csrf(request, csrf_header)
        await service.revoke_session(current_user.id, session_id)
        if event_publisher:
            await event_publisher.publish(
                room=f"user:{current_user.id}",
                event_type="session.revoked",
                payload={
                    "user_id": str(current_user.id),
                    "session_id": str(session_id),
                    "reason": "remote_revocation",
                },
            )

    return router
