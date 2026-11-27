import { Alert, Badge, Button, Skeleton } from "@board/ui";
import { useMe, useProjects, useRestoreProject } from "../api";
import { CreateProjectDialog, ProjectCard, ProjectCardSkeleton } from "../components";
import { PROJECTS_MESSAGES as MSG } from "../constants";

const gridStyles = "grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,290px),1fr))]";

/** Super Admin only: archived projects with Restore. Everyone else never sees archived projects. */
function ArchivedProjects({ projects }: { projects: { id: string; name: string }[] }) {
  const restore = useRestoreProject();
  return (
    <section aria-labelledby="archived-projects-title" className="flex flex-col gap-3">
      <h2 id="archived-projects-title" className="font-display text-heading-2">
        {MSG.ARCHIVED_SECTION}
      </h2>
      {restore.isError ? <Alert title={MSG.RESTORE_FAILED_TITLE}>{MSG.RESTORE_FAILED_TEXT}</Alert> : null}
      {projects.length === 0 ? (
        <p className="rounded-9 border border-dashed border-line p-7 text-center text-body-small text-ink-muted">
          {MSG.ARCHIVED_EMPTY}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-12 border border-line bg-surface shadow-sm">
          <table className="w-full min-w-[420px] border-collapse text-body-small">
            <thead>
              <tr className="bg-surface-2 text-left text-overline text-ink-muted uppercase">
                <th scope="col" className="border-b border-line px-3.5 py-2.5 font-semibold">
                  {MSG.ARCHIVED_COL_PROJECT}
                </th>
                <th scope="col" className="border-b border-line px-3.5 py-2.5 font-semibold">
                  {MSG.ARCHIVED_COL_STATE}
                </th>
                <th scope="col" className="border-b border-line px-3.5 py-2.5">
                  <span className="sr-only">{MSG.ARCHIVED_COL_ACTIONS}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b border-line last:border-b-0 hover:bg-tile">
                  <td className="px-3.5 py-2.5">{project.name}</td>
                  <td className="px-3.5 py-2.5">
                    <Badge>{MSG.ARCHIVED}</Badge>
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`${MSG.RESTORE}: ${project.name}`}
                      loading={restore.isPending && restore.variables === project.id}
                      disabled={restore.isPending && restore.variables !== project.id}
                      onClick={() => restore.mutate(project.id)}
                    >
                      {MSG.RESTORE}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Keeps the room of the archived section while the list loads, so the page does not grow afterwards. */
function ArchivedProjectsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <h2 className="font-display text-heading-2">{MSG.ARCHIVED_SECTION}</h2>
      {/* Same frame as the real table: a header strip, then one row with a name, a badge and a button. */}
      <div className="overflow-hidden rounded-12 border border-line bg-surface shadow-sm">
        <div className="flex items-center gap-8 border-b border-line bg-surface-2 px-3.5 py-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="flex items-center gap-8 px-3.5 py-2.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-32 rounded-pill" />
          <Skeleton className="ml-auto h-7 w-16 rounded-7" />
        </div>
      </div>
    </div>
  );
}

/** Projects I belong to (all of them for the Super Admin). The Super Admin also creates and archives projects here. */
export function Projects() {
  const { data: me } = useMe();
  const projects = useProjects();
  const isSuperAdmin = me?.isSuperAdmin === true;

  const all = projects.data?.projects ?? [];
  const active = all.filter((project) => project.archivedAt === null);
  const archived = all.filter((project) => project.archivedAt !== null);

  let body;
  if (projects.isPending) {
    // Loading: the same grid as the real list, filled with 3 card-shaped placeholders (the count is a guess,
    // we do not know how many projects will arrive).
    // role="status" + aria-label: screen readers hear "Loading projects"; the skeletons themselves are aria-hidden.
    // It is a <ul> because the real list is a <ul> and ProjectCardSkeleton renders an <li>.
    body = (
      <ul aria-busy="true" aria-label="Loading projects" role="status" className={gridStyles}>
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
      </ul>
    );
  } else if (projects.isError) {
    body = (
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
  } else if (active.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-12 border border-dashed border-line p-8 text-center">
        <p className="font-display text-heading-3">{isSuperAdmin ? MSG.EMPTY_ADMIN : MSG.EMPTY_MEMBER}</p>
        <p className="text-body-small text-ink-muted">{isSuperAdmin ? MSG.EMPTY_ADMIN_HINT : MSG.EMPTY_MEMBER_HINT}</p>
      </div>
    );
  } else {
    body = (
      <ul aria-label={MSG.LIST_LABEL} className={gridStyles}>
        {active.map((project) => (
          <ProjectCard key={project.id} project={project} canArchive={isSuperAdmin} />
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-heading-1">{MSG.TITLE}</h1>
        {isSuperAdmin ? (
          // Greyed out (not hidden, so the row does not jump) until the list arrives. A load error re-enables it.
          <CreateProjectDialog triggerLabel={MSG.CREATE_BUTTON} disabled={projects.isPending} />
        ) : null}
      </div>
      {body}
      {/* While loading, hold the room of the archived section (Super Admin only); once loaded it shows the real one. */}
      {isSuperAdmin && projects.isPending ? <ArchivedProjectsSkeleton /> : null}
      {isSuperAdmin && projects.isSuccess ? <ArchivedProjects projects={archived} /> : null}
    </div>
  );
}
