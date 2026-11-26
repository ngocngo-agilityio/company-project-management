import { cn } from "../../lib/cn";

const SIZES = {
  26: { tile: "size-6.5 gap-0.75 rounded-7 p-1.25", square: "rounded-xs" },
  56: { tile: "size-14 gap-1.25 rounded-16 p-3", square: "rounded-[3px]" },
} as const;

export type LogoProps = {
  /** 26 in the sidebar, 56 on the sign-in card (canvas sizes). */
  size?: keyof typeof SIZES;
  className?: string;
};

/** Company Board logo: an accent tile with a 2x2 grid. Decorative, so put the app name next to it. */
export function Logo({ size = 26, className }: LogoProps) {
  const { tile, square } = SIZES[size];
  return (
    <span aria-hidden data-testid="logo" className={cn("grid shrink-0 grid-cols-2 bg-accent", tile, className)}>
      <i className={cn("block bg-on-accent", square)} />
      <i className={cn("block bg-on-accent opacity-55", square)} />
      <i className={cn("block bg-on-accent", square)} />
      <i className={cn("block bg-on-accent", square)} />
    </span>
  );
}
