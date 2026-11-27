import { WEB_ROUTES, type Invitation } from "@board/shared";
import { Alert, Badge, Button, Skeleton } from "@board/ui";
import { Link } from "react-router";
import { useInvitations, useMe } from "../api";
import { CopyLinkButton, InviteDialog } from "../components";
import { INVITATION_STATUS_LABELS, PEOPLE_MESSAGES as MSG, ROLE_LABELS } from "../constants";
import { daysAgo, expiresIn, invitationLink } from "../utils";

const STATUS_TONE = { PENDING: "warning", ACCEPTED: "success", EXPIRED: "neutral", REVOKED: "danger" } as const;

const headCellStyles = "border-b border-line px-3.5 py-2.5 font-semibold";
const cellStyles = "px-3.5 py-2.5";

function InvitationRow({ invitation }: { invitation: Invitation }) {
  // A link only helps while the person can still use it.
  const canCopy = invitation.status === "PENDING";
  return (
    <tr className="border-b border-line last:border-b-0 hover:bg-tile">
      <td className={cellStyles}>{invitation.email}</td>
      <td className={cellStyles}>
        {invitation.project ? (
          <>
            {invitation.project.name}
            {invitation.role ? <span className="text-ink-muted"> · {ROLE_LABELS[invitation.role]}</span> : null}
          </>
        ) : (
          <Badge tone="accent" className="whitespace-nowrap">
            {MSG.APP_ACCESS_ONLY}
          </Badge>
        )}
      </td>
      <td className={cellStyles}>{invitation.invitedBy.name}</td>
      <td className={cellStyles}>
        <Badge tone={STATUS_TONE[invitation.status]}>{INVITATION_STATUS_LABELS[invitation.status]}</Badge>
        {invitation.status === "PENDING" ? (
          <p className="mt-0.5 text-body-small whitespace-nowrap text-ink-muted">{expiresIn(invitation.expiresAt)}</p>
        ) : null}
      </td>
      <td className={cellStyles}>{daysAgo(invitation.createdAt)}</td>
      <td className={`${cellStyles} text-right`}>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canCopy ? (
            <CopyLinkButton
              text={invitationLink()}
              label={MSG.COPY_LINK}
              ariaLabel={MSG.actionLabel(MSG.COPY_LINK, invitation.email)}
            />
          ) : null}
        </div>
      </td>
    </tr>
  );
}

/** Same frame as the real table, so the page does not grow once the list arrives. */
function InvitationsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading invitations">
      <div aria-hidden="true" className="overflow-hidden rounded-12 border border-line bg-surface shadow-sm">
        <div className="flex items-center gap-8 border-b border-line bg-surface-2 px-3.5 py-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-8 border-b border-line px-3.5 py-2.5 last:border-b-0">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-20 rounded-pill" />
            <Skeleton className="ml-auto h-7 w-24 rounded-7" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** People screen. Super Admin only: invite a person with no project, copy the link. */
export function People() {
  const { data: me, isPending: mePending } = useMe();
  const isSuperAdmin = me?.isSuperAdmin === true;
  // Nobody else asks the server: it would answer 403 anyway.
  const invitations = useInvitations(isSuperAdmin);

  // The session answer is normally already cached by RequireAuth; do not flash the refusal while it is not.
  if (mePending) return <InvitationsSkeleton />;

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert title={MSG.FORBIDDEN_TITLE}>{MSG.FORBIDDEN_TEXT}</Alert>
        <Button asChild variant="secondary">
          <Link to={WEB_ROUTES.PROJECTS}>{MSG.BACK}</Link>
        </Button>
      </div>
    );
  }

  let body;
  if (invitations.isPending) {
    body = <InvitationsSkeleton />;
  } else if (invitations.isError) {
    body = (
      <Alert
        title={MSG.LOAD_FAILED_TITLE}
        action={
          <Button variant="secondary" size="sm" onClick={() => void invitations.refetch()}>
            {MSG.RETRY}
          </Button>
        }
      >
        {MSG.LOAD_FAILED_TEXT}
      </Alert>
    );
  } else if (invitations.data.invitations.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-12 border border-dashed border-line p-8 text-center">
        <p className="font-display text-heading-3">{MSG.EMPTY}</p>
        <p className="text-body-small text-ink-muted">{MSG.EMPTY_HINT}</p>
      </div>
    );
  } else {
    body = (
      <div className="overflow-x-auto rounded-12 border border-line bg-surface shadow-sm">
        <table aria-label={MSG.LIST_LABEL} className="w-full min-w-[720px] border-collapse text-body-small">
          <thead>
            <tr className="bg-surface-2 text-left text-overline text-ink-muted uppercase">
              <th scope="col" className={headCellStyles}>
                {MSG.COL_EMAIL}
              </th>
              <th scope="col" className={headCellStyles}>
                {MSG.COL_ACCESS}
              </th>
              <th scope="col" className={headCellStyles}>
                {MSG.COL_INVITED_BY}
              </th>
              <th scope="col" className={headCellStyles}>
                {MSG.COL_STATUS}
              </th>
              <th scope="col" className={headCellStyles}>
                {MSG.COL_WHEN}
              </th>
              <th scope="col" className="border-b border-line px-3.5 py-2.5">
                <span className="sr-only">{MSG.COL_ACTIONS}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invitations.data.invitations.map((invitation) => (
              <InvitationRow key={invitation.id} invitation={invitation} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-heading-1">{MSG.TITLE}</h1>
        <InviteDialog triggerLabel={MSG.INVITE_BUTTON} />
      </div>
      <section aria-labelledby="invitations-title" className="flex flex-col gap-3">
        <h2 id="invitations-title" className="font-display text-heading-2">
          {MSG.INVITATIONS_SECTION}
        </h2>
        <p className="-mt-1.5 text-body-small text-ink-muted">{MSG.INVITATIONS_HINT}</p>
        {body}
      </section>
    </div>
  );
}
