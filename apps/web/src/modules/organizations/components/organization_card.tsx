"use client";

import type { OrganizationResponse } from "@feedio/api-client";
import { ArrowRight } from "lucide-react";

import {
  Card,
  CardBadge,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/modules/ui";

interface OrganizationCardProps {
  organization: OrganizationResponse;
  index: number;
}

export function OrganizationCard({
  organization,
  index,
}: OrganizationCardProps) {
  return (
    <Card href={`/app/organizations/${organization.slug}`}>
      <CardContent>
        <CardHeader>
          <CardBadge>{String(index + 1).padStart(2, "0")}</CardBadge>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {organization.slug}
          </span>
        </CardHeader>
        <CardTitle>{organization.name}</CardTitle>
        <CardDescription>
          Open organization to review media and manage projects.
        </CardDescription>
      </CardContent>
      <CardFooter>
        <span>Open organization</span>
        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </CardFooter>
    </Card>
  );
}
