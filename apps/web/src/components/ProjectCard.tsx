import { WEB_ROUTES, type ProjectListResponse } from "@board/shared";
import { Avatar, Button } from "@board/ui";
import { generatePath, Link } from "react-router";
import { PROJECTS_MESSAGES as MSG, ROLE_LABELS } from "../constants";
import { projectColorIndex, projectInitials } from "../utils";
import { ArchiveProjectDialog } from "./ArchiveProjectDialog";

type Project = ProjectListResponse["projects"][number];

// Whole class names, so Tailwind sees them.
const PIC_COLORS = ["bg-avatar-1", "bg-avatar-2", "bg-avatar-3", "bg-avatar-4", "bg-avatar-5", "bg-avatar-6"] as const;

function Stat({ value, label, alert = false }: { value: number; label: string; alert?: boolean }) {
  return (
    <div className="rounded-10 bg-surface-2 px-2.5 py-2">
      {/* Overdue turns red, and the word "overdue" says it too: colour is never the only signal. */}
      <b className={`block font-display text-heading-2 ${alert && value > 0 ? "text-danger" : ""}`}>{value}</b>
      <span className="text-caption font-normal text-ink-muted">{label}</span>
    </div>
  );
}

/** One active project: initials, name, my role, counts, the first members and its buttons. */
export function ProjectCard({ project, canArchive }: { project: Project; canArchive: boolean }) {
  const more = project.memberCount - project.members.length;
  return (
    <li className="flex flex-col gap-3.5 rounded-12 border border-line bg-surface p-4.5 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`flex size-10.5 shrink-0 items-center justify-center rounded-12 font-display font-bold text-on-avatar ${PIC_COLORS[projectColorIndex(project.name)]}`}
        >
          {projectInitials(project.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-heading-3">{project.name}</h2>
          <p className="text-body-small text-ink-muted">Your role: {ROLE_LABELS[project.role]}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat value={project.openCardCount} label={MSG.STAT_OPEN_CARDS} />
        <Stat value={project.overdueCardCount} label={MSG.STAT_OVERDUE} alert />
        <Stat value={project.boardCount} label={MSG.statBoards(project.boardCount)} />
      </div>

      {project.members.length > 0 ? (
        <div role="group" aria-label={MSG.MEMBERS_LABEL} className="flex items-center">
          {project.members.map((member) => (
            <Avatar
              key={member.id}
              name={member.name}
              src={member.avatarUrl ?? undefined}
              className="-ml-1.5 ring-2 ring-surface first:ml-0"
            />
          ))}
          {more > 0 ? (
            <span
              aria-label={MSG.moreMembers(more)}
              className="-ml-1.5 inline-flex size-6.5 items-center justify-center rounded-pill bg-surface-2 text-caption text-ink-muted ring-2 ring-surface"
            >
              +{more}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link to={generatePath(WEB_ROUTES.PROJECT, { projectId: project.id })}>
            {MSG.OPEN_BOARD}
            <span className="sr-only">: {project.name}</span>
          </Link>
        </Button>
        {canArchive ? <ArchiveProjectDialog projectId={project.id} projectName={project.name} /> : null}
      </div>
    </li>
  );
}
