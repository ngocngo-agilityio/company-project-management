import { createInvitationRequestSchema, HTTP_STATUS } from "@board/shared";
import { Alert, Button, Dialog, DialogClose, DialogContent, DialogTrigger, Input } from "@board/ui";
import { useRef, useState, type FormEvent } from "react";
import { ApiRequestError, useCreateInvitation } from "../api";
import { INVITE_DIALOG_MESSAGES as MSG, PEOPLE_MESSAGES } from "../constants";
import { invitationLink } from "../utils";
import { CopyLinkButton } from "./CopyLinkButton";

const fieldLabelStyles = "text-caption tracking-wide text-ink-muted uppercase";

function failureText(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === HTTP_STATUS.BAD_REQUEST) return MSG.EMAIL_INVALID;
    if (error.status === HTTP_STATUS.FORBIDDEN) return MSG.FAILED_FORBIDDEN;
    // Two cases share the 409: the person already has an account, or the email is already Pending.
    if (error.status === HTTP_STATUS.CONFLICT) return MSG.FAILED_CONFLICT;
  }
  return MSG.FAILED_OTHER;
}

/** Asks for the email. After the invitation is created the same dialog shows the link to copy. */
function InviteForm() {
  const create = useCreateInvitation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const parsed = createInvitationRequestSchema.safeParse({ email });
  // Nothing is flagged before the first attempt; after it, the error follows what is typed.
  const emailError =
    submitted && !parsed.success ? (email.trim() === "" ? MSG.EMAIL_REQUIRED : MSG.EMAIL_INVALID) : null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!parsed.success) {
      emailRef.current?.focus();
      return;
    }
    create.mutate(parsed.data);
  }

  if (create.isSuccess) {
    const link = invitationLink();
    return (
      <div className="flex flex-col gap-3 pt-2">
        <div role="status" className="flex flex-col gap-1 rounded-10 bg-success-soft p-3 text-success">
          <p className="text-button font-semibold">{MSG.CREATED_TITLE}</p>
          <p className="text-body-small">{MSG.CREATED_TEXT}</p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="invitation-link" className={fieldLabelStyles}>
            {MSG.LINK_LABEL}
          </label>
          <div className="flex gap-2">
            <Input id="invitation-link" readOnly value={link} onFocus={(event) => event.target.select()} />
            <CopyLinkButton text={link} label={PEOPLE_MESSAGES.COPY_LINK} />
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <DialogClose asChild>
            <Button>{MSG.DONE}</Button>
          </DialogClose>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-1 pt-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="invite-email" className={fieldLabelStyles}>
          {MSG.EMAIL_LABEL}
        </label>
        <Input
          ref={emailRef}
          id="invite-email"
          type="email"
          autoFocus
          autoComplete="off"
          placeholder={MSG.EMAIL_PLACEHOLDER}
          value={email}
          invalid={emailError !== null}
          aria-describedby={emailError ? "invite-email-error" : undefined}
          onChange={(event) => setEmail(event.target.value)}
        />
        {/* Always takes one line, so showing or clearing the error never moves the buttons below. */}
        <p id={emailError ? "invite-email-error" : undefined} className="min-h-4 text-body-small leading-4 text-danger">
          {emailError}
        </p>
      </div>

      {create.isError ? <Alert title={failureText(create.error)} className="mt-2" /> : null}

      <div className="mt-2 flex justify-end gap-2.5">
        <DialogClose asChild>
          <Button variant="secondary">{MSG.CANCEL}</Button>
        </DialogClose>
        <Button type="submit" loading={create.isPending}>
          {MSG.SUBMIT}
        </Button>
      </div>
    </form>
  );
}

/** The "Invite a person" button and its dialog. Super Admin only: the server refuses anyone else. */
export function InviteDialog({ triggerLabel, disabled = false }: { triggerLabel: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent title={MSG.TITLE} description={MSG.HINT}>
        {/* Mounted only while open, so every opening starts with an empty form. */}
        <InviteForm />
      </DialogContent>
    </Dialog>
  );
}
