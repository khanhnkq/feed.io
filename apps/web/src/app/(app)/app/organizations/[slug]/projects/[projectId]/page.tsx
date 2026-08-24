"use client";

import { useListProjects } from "@feedio/api-client";
import { Film, Upload } from "lucide-react";
import { useParams } from "next/navigation";

import { Button } from "@/modules/ui";
import { useOrganization } from "@/shared/providers/organization_context";

export default function ProjectDashboardPage() {
  const organization = useOrganization();
  const params = useParams();
  const projectId =
    typeof params?.projectId === "string" ? params.projectId : "";
  const projectsQuery = useListProjects(organization.id);
  const project = projectsQuery.data?.find((item) => item.id === projectId);

  if (projectsQuery.isPending) {
    return (
      <main
        id="main-content"
        className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
      >
        <div className="grid min-h-60 place-items-center text-sm text-muted">
          Loading project…
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main
        id="main-content"
        className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
      >
        <section className="mt-8 rounded-xl border border-dashed border-[#c7c9bf] bg-surface p-12 text-center text-muted">
          <span className="font-mono text-[54px] font-bold leading-[.9] tracking-[-.08em] text-[#c5c7bd]">
            404
          </span>
          <h2 className="my-3 text-xl font-bold text-ink">Project not found</h2>
          <p className="m-0 text-sm">
            The project you are looking for does not exist in this organization.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      <section className="mt-6 max-w-4xl">
        <h1 className="mt-2 text-[clamp(36px,5vw,60px)] font-bold leading-[.96] tracking-[-.055em]">
          {project.name}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {project.description ||
            "Upload video cuts and assets for collaborative review."}
        </p>
      </section>

      <section className="mt-12 rounded-xl border border-dashed border-[#c7c9bf] bg-surface p-12 text-center">
        <Film className="mx-auto text-muted" size={44} />
        <h2 className="mt-4 text-xl font-bold">No media assets uploaded yet</h2>
        <p className="mt-2 text-sm text-muted">
          Upload video files or create review links to start gathering
          timestamped feedback.
        </p>
        <Button disabled className="mt-6" size="sm" variant="primary">
          <Upload size={15} /> Upload video cut (Coming soon)
        </Button>
      </section>
    </main>
  );
}
