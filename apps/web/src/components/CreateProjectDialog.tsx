import { createProjectRequestSchema, HTTP_STATUS, PROJECT_NAME_MAX } from "@board/shared";
import {
  Alert,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  Input,
  PersonPicker,
  Skeleton,
} from "@board/ui";
import { useRef, useState, type FormEvent } from "react";
import { ApiRequestError, useActivePeople, useCreateProject, useMe } from "../api";
import { CREATE_PROJECT_MESSAGES as MSG } from "../constants";

const fieldLabelStyles = "text-caption tracking-wide text-ink-muted uppercase";

function failureText(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === HTTP_STATUS.BAD_REQUEST) return MSG.FAILED_INVALID;
    if (error.status === HTTP_STATUS.FORBIDDEN) return MSG.FAILED_FORBIDDEN;
  }
  return MSG.FAILED_OTHER;
}

function CreateProjectForm({ onDone }: { onDone: () => void }) {
  const { data: me } = useMe();
  const people = useActivePeople();
  const create = useCreateProject();
  const [name, setName] = useState("");
  const [pickedOwner, setPickedOwner] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const ownerRef = useRef<HTMLButtonElement>(null);

  const options = people.data?.people ?? [];
  // Until someone else is picked, the Super Admin owns the project (the API allows it).
  const fallbackOwner = options.find((person) => person.id === me?.id)?.id ?? "";
  const ownerId = pickedOwner || fallbackOwner;

  // Nothing is flagged before the first attempt; after it, errors follow what is typed or picked.
  const parsed = createProjectRequestSchema.safeParse({ name, ownerId });
  const failedFields = new Set(parsed.success ? [] : parsed.error.issues.map((issue) => issue.path[0]));
  const nameError =
    submitted && failedFields.has("name")
      ? name.trim() === ""
        ? MSG.NAME_REQUIRED
        : MSG.NAME_TOO_LONG(PROJECT_NAME_MAX)
      : null;
  const ownerError = submitted && failedFields.has("ownerId") ? MSG.OWNER_REQUIRED : null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!parsed.success) {
      // Put the keyboard where the problem is.
      (failedFields.has("name") ? nameRef : ownerRef).current?.focus();
      return;
    }
    create.mutate(parsed.data, { onSuccess: onDone });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-1 pt-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="project-name" className={fieldLabelStyles}>
          {MSG.NAME_LABEL}
        </label>
        <Input
          ref={nameRef}
          id="project-name"
          autoFocus
          autoComplete="off"
          placeholder={MSG.NAME_PLACEHOLDER}
          value={name}
          invalid={nameError !== null}
          aria-describedby={nameError ? "project-name-error" : undefined}
          onChange={(event) => setName(event.target.value)}
        />
        {/* Always takes one line, so showing or clearing the error never moves the fields below. */}
        <p id={nameError ? "project-name-error" : undefined} className="min-h-4 text-body-small leading-4 text-danger">
          {nameError}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="project-owner" className={fieldLabelStyles}>
          {MSG.OWNER_LABEL}
        </label>
        {people.isPending ? (
          <Skeleton className="h-(--control-h)" />
        ) : people.isError ? (
          <Alert
            title={MSG.PEOPLE_FAILED_TITLE}
            action={
              <Button variant="secondary" size="sm" onClick={() => void people.refetch()}>
                Try again
              </Button>
            }
          />
        ) : (
          <PersonPicker
            ref={ownerRef}
            id="project-owner"
            people={options}
            value={ownerId}
            placeholder="Choose an owner"
            invalid={ownerError !== null}
            aria-describedby={ownerError ? "project-owner-error" : undefined}
            onValueChange={setPickedOwner}
          />
        )}
        {/* Always takes one line, so showing or clearing the error never moves the fields below. */}
        <p
          id={ownerError ? "project-owner-error" : undefined}
          className="min-h-4 text-body-small leading-4 text-danger"
        >
          {ownerError}
        </p>
      </div>

      {create.isError ? <Alert title={failureText(create.error)} className="mt-2" /> : null}

      <div className="mt-2 flex justify-end gap-2.5">
        <DialogClose asChild>
          <Button variant="secondary">{MSG.CANCEL}</Button>
        </DialogClose>
        <Button type="submit" loading={create.isPending} disabled={people.isPending || people.isError}>
          {MSG.SUBMIT}
        </Button>
      </div>
    </form>
  );
}

/** The "Create project" button and its dialog. Super Admin only: the server refuses anyone else. */
export function CreateProjectDialog({ triggerLabel, disabled = false }: { triggerLabel: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent title={MSG.TITLE} description={MSG.HINT}>
        {/* Mounted only while open, so every opening starts with an empty form. */}
        <CreateProjectForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
