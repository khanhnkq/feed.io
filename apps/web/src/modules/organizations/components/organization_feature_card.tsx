"use client";

import { ArrowRight, type LucideIcon } from "lucide-react";

import {
  Card,
  CardBadge,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/modules/ui";

export interface OrganizationFeature {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  actionLabel: string;
  meta: string;
  available: boolean;
}

interface OrganizationFeatureCardProps {
  feature: OrganizationFeature;
}

export function OrganizationFeatureCard({
  feature,
}: OrganizationFeatureCardProps) {
  const {
    title,
    description,
    href,
    icon: Icon,
    actionLabel,
    meta,
    available,
  } = feature;

  if (!available) {
    return (
      <Card disabled>
        <CardContent>
          <CardHeader>
            <CardBadge>
              <Icon size={18} aria-hidden strokeWidth={2} />
            </CardBadge>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {meta}
            </span>
          </CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardContent>
        <CardFooter className="text-muted">
          <span>Coming soon</span>
          <small className="font-mono text-[8px] font-bold uppercase tracking-[.08em] text-[#777b70]">
            Soon
          </small>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card href={href}>
      <CardContent>
        <CardHeader>
          <CardBadge>
            <Icon size={18} aria-hidden strokeWidth={2} />
          </CardBadge>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {meta}
          </span>
        </CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardContent>
      <CardFooter>
        <span>{actionLabel}</span>
        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </CardFooter>
    </Card>
  );
}
