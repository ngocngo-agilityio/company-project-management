import { cva } from "class-variance-authority";

/** Soft background + strong text pairs shared by Badge and Chip. */
export const toneStyles = cva("", {
  variants: {
    tone: {
      neutral: "bg-surface-2 text-ink-muted",
      accent: "bg-accent-soft text-accent",
      danger: "bg-danger-soft text-danger",
      warning: "bg-warning-soft text-warning",
      success: "bg-success-soft text-success",
    },
  },
  defaultVariants: { tone: "neutral" },
});
