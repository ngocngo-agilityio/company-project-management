import { cn } from "./cn";

/**
 * Look of a text field (Input, PersonPicker button and search box): border, radius, colours and focus.
 * Focus is the border turning `accent` plus a soft ring hugging the field, instead of the global offset
 * outline, which doubles the border and is clipped inside scrolling or rounded containers.
 */
export function fieldStyles(invalid = false): string {
  return cn(
    "rounded-7 border bg-surface text-body text-ink placeholder:text-ink-muted focus-visible:ring-3 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
    invalid
      ? "border-danger focus-visible:border-danger focus-visible:ring-danger-soft"
      : "border-line focus-visible:border-accent focus-visible:ring-accent-soft",
  );
}
