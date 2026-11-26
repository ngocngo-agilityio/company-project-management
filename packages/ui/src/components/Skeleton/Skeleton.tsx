import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export type SkeletonProps = ComponentProps<"div">;

/** Grey placeholder block shown while content loads. Size it with `className`. Hidden from screen readers. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-10 bg-surface-2 motion-reduce:animate-none", className)}
      {...props}
    />
  );
}
