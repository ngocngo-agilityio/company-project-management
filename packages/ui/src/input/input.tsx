import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

export type InputProps = ComponentProps<"input"> & {
  /** Marks the field as having an error (border and aria-invalid). Show the message as text next to it. */
  invalid?: boolean;
};

export function Input({ invalid = false, className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-(--control-h) w-full rounded-7 border bg-surface px-2.5 text-body text-ink placeholder:text-ink-muted disabled:cursor-not-allowed disabled:opacity-50",
        invalid ? "border-danger" : "border-line",
        className,
      )}
      {...props}
    />
  );
}
