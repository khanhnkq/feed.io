"use client";

import type { ProjectResponse } from "@feedio/api-client";
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
import { useOrganization } from "@/shared/providers/organization_context";

interface ProjectCardProps {
  project: ProjectResponse;
  index: number;
  viewMode?: "grid" | "list";
}

export function ProjectCard({
  project,
  index,
  viewMode = "grid",
}: ProjectCardProps) {
  const organization = useOrganization();
  const createdAt = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(project.created_at));
  const isList = viewMode === "list";
  const projectHref = `/app/organizations/${organization.slug}/projects/${project.id}`;

  return (
    <Card
      href={projectHref}
      className={isList ? "sm:flex-row sm:items-center sm:gap-6" : ""}
    >
      <CardContent className={isList ? "flex-1" : ""}>
        <CardHeader>
          <CardBadge>{String(index + 1).padStart(2, "0")}</CardBadge>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {createdAt}
          </span>
        </CardHeader>
        <CardTitle>{project.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {project.description ||
            "Upload video cuts and assets for collaborative review."}
        </CardDescription>
      </CardContent>
      <CardFooter
        bordered={!isList}
        className={isList ? "sm:mt-0 sm:border-t-0 sm:pt-0" : ""}
      >
        <span>Open project</span>
        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </CardFooter>
    </Card>
  );
}
