import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { toneStyles } from "../../lib/tone";

const badgeStyles = "inline-flex items-center rounded-pill px-2.5 py-0.5 text-caption font-semibold";

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof toneStyles>;

/** Pill for a status or role. Say it in words, never in colour alone. */
export function Badge({ tone, className, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles, toneStyles({ tone }), className)} {...props} />;
}
