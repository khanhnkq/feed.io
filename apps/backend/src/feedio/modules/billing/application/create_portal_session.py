from feedio.modules.billing.application.ports import PaymentGatewayPort, SubscriptionRepository
from feedio.modules.billing.domain.errors import (
    InsufficientBillingPermissionError,
    SubscriptionNotFoundError,
)
from feedio.modules.organizations.domain.value_objects import OrganizationContext, OrganizationRole


class CreatePortalSession:
    def __init__(
        self,
        payment_gateway: PaymentGatewayPort,
        subscription_repository: SubscriptionRepository,
    ) -> None:
        self._gateway = payment_gateway
        self._repository = subscription_repository

    async def execute(
        self,
        *,
        context: OrganizationContext,
        return_url: str,
    ) -> str:
        if context.role not in (OrganizationRole.OWNER, OrganizationRole.ADMIN):
            raise InsufficientBillingPermissionError(
                "Only organization owners and administrators can access the billing portal"
            )

        subscription = await self._repository.get_by_organization_id(context.organization_id)
        if not subscription or not subscription.provider_customer_id:
            raise SubscriptionNotFoundError(
                "No active billing customer found for this organization. Please subscribe first."
            )

        return await self._gateway.create_customer_portal_session(
            customer_id=subscription.provider_customer_id,
            return_url=return_url,
        )
