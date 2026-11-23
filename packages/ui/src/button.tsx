import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "./cn";

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-7 text-button font-semibold whitespace-nowrap select-none disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent hover:opacity-90",
        secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
        ghost: "text-ink hover:bg-surface-2",
        danger: "border border-danger bg-surface text-danger hover:bg-danger-soft",
      },
      size: {
        md: "min-h-(--control-h) px-3.5",
        sm: "min-h-(--control-h-sm) px-2.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonStyles> & {
    /** Render the child element (for example a router link) with the button styles. */
    asChild?: boolean;
  };

export function Button({ variant, size, asChild = false, className, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonStyles({ variant, size }), className)}
      {...(asChild ? {} : { type: type ?? "button" })}
      {...props}
    />
  );
}
