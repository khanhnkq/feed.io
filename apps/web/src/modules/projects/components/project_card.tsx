import type { ProjectResponse } from "@feedio/api-client";
import { ArrowUpRight, Clock3, MoreHorizontal, Play } from "lucide-react";

interface ProjectCardProps {
  project: ProjectResponse;
  index: number;
  viewMode: "grid" | "list";
}

const coverTones = ["bg-lilac", "bg-orange", "bg-cyan", "bg-lime"] as const;

export function ProjectCard({ project, index, viewMode }: ProjectCardProps) {
  const createdAt = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(project.created_at));
  const isList = viewMode === "list";

  return (
    <article
      className={`overflow-hidden rounded-xl border border-[#d8d9d2] bg-surface transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgb(38_39_32_/_10%)] ${isList ? "sm:grid sm:grid-cols-[260px_minmax(0,1fr)]" : ""}`}
    >
      <div
        className={`relative aspect-video overflow-hidden border-b border-[#c8c9c1] p-4 before:absolute before:-right-[18%] before:-top-[35%] before:aspect-square before:w-[70%] before:rounded-full before:border before:border-ink/30 before:content-[''] after:absolute after:right-[9%] after:-top-[6%] after:aspect-square after:w-[42%] after:rounded-full after:border after:border-ink/30 after:bg-white/15 after:content-[''] ${coverTones[index % coverTones.length]} ${isList ? "sm:min-h-[170px] sm:aspect-auto sm:border-b-0 sm:border-r" : ""}`}
      >
        <span className="relative z-[2] font-mono text-[10px] font-bold tracking-[.1em]">
          PROJECT / {String(index + 1).padStart(2, "0")}
        </span>
        <span
          aria-hidden="true"
          className="absolute bottom-[15px] right-4 z-[3] grid size-[38px] place-items-center rounded-full border border-ink bg-ink pl-0.5 text-white"
        >
          <Play fill="currentColor" size={16} />
        </span>
        <span className="absolute bottom-[15px] left-4 z-[2] font-mono text-[10px] font-bold">0 assets</span>
      </div>
      <div className={`p-[18px] ${isList ? "flex flex-col" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-[17px] font-bold tracking-[-.02em]">{project.name}</h2>
            <p className="mt-2 min-h-[34px] text-xs leading-[1.45] text-muted">
              {project.description || "Ready for the first review."}
            </p>
          </div>
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-md border-0 bg-transparent text-ink disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Project menu coming soon"
            disabled
          >
            <MoreHorizontal size={19} />
          </button>
        </div>
        <footer className={`flex items-center justify-between border-t border-[#e5e5de] pt-[13px] text-[11px] text-muted ${isList ? "mt-auto" : "mt-[21px]"}`}>
          <span className="flex items-center gap-1">
            <Clock3 size={14} /> {createdAt}
          </span>
          <span className="flex items-center gap-1 font-bold text-ink">
            Open <ArrowUpRight size={14} />
          </span>
        </footer>
      </div>
    </article>
  );
}
