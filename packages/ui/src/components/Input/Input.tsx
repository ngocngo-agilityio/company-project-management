import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { fieldStyles } from "../../lib/field-styles";

export type InputProps = ComponentProps<"input"> & {
  /** Marks the field as having an error (border and aria-invalid). Show the message as text next to it. */
  invalid?: boolean;
};

export function Input({ invalid = false, className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      aria-invalid={invalid || undefined}
      className={cn("min-h-(--control-h) w-full px-2.5", fieldStyles(invalid), className)}
      {...props}
    />
  );
}
