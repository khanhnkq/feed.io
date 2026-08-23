import type { ProjectResponse } from "@feedio/api-client";
import { ArrowUpRight, Clock3, MoreHorizontal, Play } from "lucide-react";

interface ProjectCardProps {
  project: ProjectResponse;
  index: number;
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  const createdAt = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(project.created_at));

  return (
    <article className="project-card">
      <div className={`project-cover cover-${(index % 4) + 1}`}>
        <span className="cover-kicker">PROJECT / {String(index + 1).padStart(2, "0")}</span>
        <button type="button" aria-label={`Open ${project.name}`} className="play-button">
          <Play fill="currentColor" size={16} />
        </button>
        <span className="media-count">0 assets</span>
      </div>
      <div className="project-card-body">
        <div className="project-title-row">
          <div>
            <h2>{project.name}</h2>
            <p>{project.description || "Ready for the first review."}</p>
          </div>
          <button type="button" className="ghost-icon" aria-label="Project menu">
            <MoreHorizontal size={19} />
          </button>
        </div>
        <footer>
          <span>
            <Clock3 size={14} /> {createdAt}
          </span>
          <span className="open-project">
            Open <ArrowUpRight size={14} />
          </span>
        </footer>
      </div>
    </article>
  );
}
