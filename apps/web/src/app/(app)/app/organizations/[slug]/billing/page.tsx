"use client";

import { useOrganization } from "@/shared/providers/organization_context";
import { BillingScreen } from "@/modules/billing";

export default function OrganizationBillingPage() {
  const organization = useOrganization();

  return (
    <BillingScreen
      organizationId={organization.id}
      organizationSlug={organization.slug}
      organizationName={organization.name}
    />
  );
}
