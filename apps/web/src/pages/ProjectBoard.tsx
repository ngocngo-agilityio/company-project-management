import { WEB_ROUTES } from "@board/shared";
import { Alert, Badge, Button, Skeleton } from "@board/ui";
import { Link, useParams } from "react-router";
import { useProjects } from "../api";
import { NotFound } from "../components";
import { PROJECT_PAGE_MESSAGES as PAGE, PROJECTS_MESSAGES as MSG, ROLE_LABELS } from "../constants";

/**
 * Temporary page behind "Open board": the board screen does not exist yet. It reads the person's project
 * list, so a project that is not theirs is a plain "Page not found" and its existence is not revealed.
 */
export function ProjectBoard() {
  const { projectId } = useParams();
  const projects = useProjects();

  if (projects.isPending) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading project">
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (projects.isError) {
    return (
      <Alert
        title={MSG.LOAD_FAILED_TITLE}
        action={
          <Button variant="secondary" size="sm" onClick={() => void projects.refetch()}>
            {MSG.RETRY}
          </Button>
        }
      >
        {MSG.LOAD_FAILED_TEXT}
      </Alert>
    );
  }
  const project = projects.data.projects.find((item) => item.id === projectId);
  if (!project) return <NotFound />;

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-heading-1">{project.name}</h1>
      <p className="text-body-small text-ink-muted">Your role: {ROLE_LABELS[project.role]}</p>
      {project.archivedAt ? <Badge className="self-start">{PAGE.ARCHIVED_NOTE}</Badge> : null}
      <p className="text-body text-ink-muted">{PAGE.COMING_SOON}</p>
      <Link to={WEB_ROUTES.PROJECTS} className="self-start text-button text-accent underline">
        {PAGE.BACK}
      </Link>
    </div>
  );
}
