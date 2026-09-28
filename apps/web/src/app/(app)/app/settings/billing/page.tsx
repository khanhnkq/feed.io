"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useListOrganizations } from "@feedio/api-client";
import { Loader2 } from "lucide-react";

export default function SettingsBillingRedirectPage() {
  const router = useRouter();
  const orgsQuery = useListOrganizations(undefined, { query: { retry: false } });

  useEffect(() => {
    if (orgsQuery.data) {
      const firstOrg = orgsQuery.data.items[0];
      if (firstOrg?.slug) {
        router.replace(`/app/organizations/${firstOrg.slug}/billing`);
      } else {
        router.replace("/app");
      }
    }
  }, [orgsQuery.data, router]);

  return (
    <div className="flex h-96 items-center justify-center text-sm text-muted">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      <span>Redirecting to organization billing...</span>
    </div>
  );
}
