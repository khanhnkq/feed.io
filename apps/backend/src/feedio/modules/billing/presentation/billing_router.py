from collections.abc import Awaitable, Callable
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from feedio.modules.billing.application.create_checkout_session import CreateCheckoutSession
from feedio.modules.billing.application.create_portal_session import CreatePortalSession
from feedio.modules.billing.application.get_organization_billing import GetOrganizationBilling
from feedio.modules.billing.domain.errors import (
    InsufficientBillingPermissionError,
    InvalidBillingIntervalError,
    InvalidPlanTierError,
    PaymentGatewayError,
    SubscriptionNotFoundError,
)
from feedio.modules.billing.presentation.schemas import (
    BillingOverviewResponse,
    CreateCheckoutSessionRequest,
    CreateCheckoutSessionResponse,
    CreatePortalSessionRequest,
    CreatePortalSessionResponse,
    PlatformSettingsResponse,
    UpdatePlatformSettingsRequest,
)
from feedio.modules.identity.domain.value_objects import CurrentUser
from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.organizations.domain.value_objects import OrganizationContext


def create_billing_router(
    get_billing_provider: Callable[..., Any],
    create_checkout_provider: Callable[..., Any],
    create_portal_provider: Callable[..., Any],
    organization_context_provider: Callable[..., Awaitable[OrganizationContext]],
    current_user_provider: Callable[..., CurrentUser | Awaitable[CurrentUser]],
    get_organization_slug_provider: Callable[[UUID], Awaitable[str | None]] | None = None,
    platform_settings_provider: Callable[..., Any] | None = None,
) -> APIRouter:
    router = APIRouter(tags=["billing"])

    @router.get(
        "/organizations/{organization_id}/billing",
        response_model=BillingOverviewResponse,
    )
    async def get_organization_billing(
        organization_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        get_billing: Annotated[GetOrganizationBilling, Depends(get_billing_provider)],
    ) -> BillingOverviewResponse:
        overview = await get_billing.execute(context=context)
        return BillingOverviewResponse(
            organization_id=overview.organization_id,
            plan_tier=overview.plan_tier,
            billing_interval=overview.billing_interval,
            status=overview.status,
            storage_used_bytes=overview.storage_used_bytes,
            storage_quota_bytes=overview.storage_quota_bytes,
            storage_usage_percentage=overview.storage_usage_percentage,
            active_members_count=overview.active_members_count,
            max_members=overview.max_members,
            current_period_end=overview.current_period_end,
            cancel_at_period_end=overview.cancel_at_period_end,
            has_payment_method=overview.has_payment_method,
            payments_enabled=overview.payments_enabled,
        )

    @router.post(
        "/organizations/{organization_id}/billing/checkout",
        response_model=CreateCheckoutSessionResponse,
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def create_checkout_session(
        organization_id: UUID,
        payload: CreateCheckoutSessionRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        checkout_use_case: Annotated[CreateCheckoutSession, Depends(create_checkout_provider)],
    ) -> CreateCheckoutSessionResponse:
        org_slug = "org"
        if get_organization_slug_provider:
            resolved_slug = await get_organization_slug_provider(organization_id)
            if resolved_slug:
                org_slug = resolved_slug

        try:
            checkout_url = await checkout_use_case.execute(
                context=context,
                organization_slug=org_slug,
                user_email=current_user.email,
                plan_tier=payload.plan_tier,
                billing_interval=payload.billing_interval,
                success_url=payload.success_url,
                cancel_url=payload.cancel_url,
            )
            return CreateCheckoutSessionResponse(checkout_url=checkout_url)
        except (InvalidPlanTierError, InvalidBillingIntervalError) as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e
        except InsufficientBillingPermissionError as e:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(e)) from e
        except PaymentGatewayError as e:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(e)) from e

    @router.post(
        "/organizations/{organization_id}/billing/portal",
        response_model=CreatePortalSessionResponse,
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def create_portal_session(
        organization_id: UUID,
        payload: CreatePortalSessionRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        portal_use_case: Annotated[CreatePortalSession, Depends(create_portal_provider)],
    ) -> CreatePortalSessionResponse:
        try:
            portal_url = await portal_use_case.execute(
                context=context,
                return_url=payload.return_url,
            )
            return CreatePortalSessionResponse(portal_url=portal_url)
        except InsufficientBillingPermissionError as e:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(e)) from e
        except SubscriptionNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
        except PaymentGatewayError as e:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(e)) from e

    @router.get(
        "/admin/platform-settings",
        response_model=PlatformSettingsResponse,
    )
    async def get_platform_settings(
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        platform_settings: Annotated[
            Any, Depends(platform_settings_provider or (lambda: None))
        ],
    ) -> PlatformSettingsResponse:
        enabled = True
        if platform_settings and hasattr(platform_settings, "is_payments_enabled"):
            enabled = await platform_settings.is_payments_enabled()
        provider = "mock"
        if hasattr(platform_settings, "provider") and platform_settings.provider == "stripe":
            provider = "stripe"
        return PlatformSettingsResponse(
            payments_enabled=enabled,
            billing_provider=provider,
        )

    @router.patch(
        "/admin/platform-settings",
        response_model=PlatformSettingsResponse,
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def update_platform_settings(
        payload: UpdatePlatformSettingsRequest,
        current_user: Annotated[CurrentUser, Depends(current_user_provider)],
        platform_settings: Annotated[
            Any, Depends(platform_settings_provider or (lambda: None))
        ],
    ) -> PlatformSettingsResponse:
        if current_user.platform_role != "super_admin":
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "Only super administrators can modify platform payment settings",
            )

        enabled = payload.payments_enabled
        if platform_settings and hasattr(platform_settings, "set_payments_enabled"):
            enabled = await platform_settings.set_payments_enabled(payload.payments_enabled)

        provider = "mock"
        if hasattr(platform_settings, "provider") and platform_settings.provider == "stripe":
            provider = "stripe"
        return PlatformSettingsResponse(
            payments_enabled=enabled,
            billing_provider=provider,
        )

    return router
