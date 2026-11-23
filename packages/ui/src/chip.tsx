import { X } from "lucide-react";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "./cn";
import { toneStyles } from "./tone";

const chipStyles = "inline-flex items-center gap-1.5 rounded-6 px-2 py-0.5 text-caption font-semibold";

export type ChipProps = Omit<ComponentProps<"span">, "children"> &
  VariantProps<typeof toneStyles> & {
    children: string;
    /** When set, a remove button is shown and calls this. */
    onRemove?: () => void;
  };

/** Small tag for a date or a filter. The text is a string so the remove button can name it. */
export function Chip({ tone, onRemove, className, children, ...props }: ChipProps) {
  return (
    <span className={cn(chipStyles, toneStyles({ tone }), className)} {...props}>
      {children}
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${children}`}
          onClick={onRemove}
          // The ::after widens the hit area to 44px without growing the chip.
          className="relative -mr-1 inline-flex size-4 items-center justify-center rounded-6 after:absolute after:-inset-3.5 after:content-['']"
        >
          <X size={12} strokeWidth={1.8} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}
