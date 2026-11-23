import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

/** The scrim must sit under its own panel: modal-scrim (55) < modal (60), scrim (65) < drawer (70). */
function Overlay({ className }: { className: string }) {
  return <RadixDialog.Overlay className={cn("fixed inset-0 bg-scrim", className)} />;
}

const closeButtonStyles =
  "absolute top-2 right-2 inline-flex size-11 items-center justify-center rounded-7 text-ink-muted hover:bg-surface-2 min-[900px]:size-9";

export type DialogContentProps = {
  /** Required: it names the dialog for screen readers. */
  title: string;
  description?: string;
  /** sm = 460px (confirm, forms), md = 760px (card). */
  size?: "sm" | "md";
  children?: ReactNode;
  className?: string;
};

export function DialogContent({ title, description, size = "sm", children, className }: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <Overlay className="z-(--z-modal-scrim)" />
      <RadixDialog.Content
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "fixed top-1/2 left-1/2 z-(--z-modal) max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-12 bg-surface p-4.5 text-ink shadow-lg",
          size === "md" ? "max-w-dialog" : "max-w-dialog-sm",
          className,
        )}
      >
        <RadixDialog.Title className="pr-13 font-display min-[900px]:pr-10 text-heading-2">{title}</RadixDialog.Title>
        {description ? (
          <RadixDialog.Description className="mt-1 text-body-small text-ink-muted">
            {description}
          </RadixDialog.Description>
        ) : null}
        <div className="mt-3">{children}</div>
        <RadixDialog.Close aria-label="Close" className={closeButtonStyles}>
          <X size={18} strokeWidth={1.8} aria-hidden />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export type DrawerContentProps = {
  /** Names the drawer for screen readers. */
  title: string;
  children?: ReactNode;
  className?: string;
};

/** Left drawer (phone and tablet menu). Same Radix Dialog behaviour: focus trap, Esc, focus return. */
export function DrawerContent({ title, children, className }: DrawerContentProps) {
  return (
    <RadixDialog.Portal>
      <Overlay className="z-(--z-scrim)" />
      <RadixDialog.Content
        aria-describedby={undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-(--z-drawer) flex w-drawer max-w-[calc(100vw-48px)] flex-col overflow-y-auto bg-surface text-ink shadow-lg",
          className,
        )}
      >
        <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
