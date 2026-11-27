import { HTTP_STATUS } from "@board/shared";
import { Alert, Button, Dialog, DialogClose, DialogContent, DialogTrigger } from "@board/ui";
import { useState } from "react";
import { ApiRequestError, useArchiveProject } from "../api";
import { ARCHIVE_PROJECT_MESSAGES as MSG } from "../constants";

function failureText(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === HTTP_STATUS.CONFLICT) return MSG.FAILED_CONFLICT;
    if (error.status === HTTP_STATUS.FORBIDDEN) return MSG.FAILED_FORBIDDEN;
  }
  return MSG.FAILED_OTHER;
}

function ArchiveProjectBody({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const archive = useArchiveProject();
  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-body text-ink-muted">{MSG.TEXT}</p>
      {archive.isError ? <Alert title={failureText(archive.error)} /> : null}
      <div className="flex justify-end gap-2.5">
        <DialogClose asChild>
          <Button variant="secondary">{MSG.CANCEL}</Button>
        </DialogClose>
        <Button
          variant="primary"
          loading={archive.isPending}
          onClick={() => archive.mutate(projectId, { onSuccess: onDone })}
        >
          {MSG.SUBMIT}
        </Button>
      </div>
    </div>
  );
}

/** "Archive project" button with its confirm. Super Admin only: the server refuses anyone else. */
export function ArchiveProjectDialog({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" aria-label={`${MSG.TRIGGER}: ${projectName}`}>
          {MSG.TRIGGER}
        </Button>
      </DialogTrigger>
      <DialogContent title={MSG.title(projectName)}>
        {/* Mounted only while open, so an old error never shows the next time. */}
        <ArchiveProjectBody projectId={projectId} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
