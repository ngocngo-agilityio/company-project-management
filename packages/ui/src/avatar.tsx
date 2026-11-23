import * as RadixAvatar from "@radix-ui/react-avatar";
import { cn } from "./cn";

const COLORS = ["bg-avatar-1", "bg-avatar-2", "bg-avatar-3", "bg-avatar-4", "bg-avatar-5", "bg-avatar-6"] as const;

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "?";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Stable 1..6 from the name, used when the caller has no user number. */
export function colorIndexOf(name: string): number {
  let sum = 0;
  for (const ch of name) sum += ch.codePointAt(0) ?? 0;
  return (sum % COLORS.length) + 1;
}

export type AvatarProps = {
  name: string;
  src?: string;
  /** 1..6, usually the person's number. Defaults to a hash of the name. */
  colorIndex?: number;
  /** Diameter in px. Canvas sizes: 22 (card), 26 (default), 34 (sidebar). */
  size?: number;
  className?: string;
};

export function Avatar({ name, src, colorIndex, size = 26, className }: AvatarProps) {
  const index =
    colorIndex !== undefined && Number.isInteger(colorIndex) && colorIndex >= 1 && colorIndex <= COLORS.length
      ? colorIndex
      : colorIndexOf(name);
  return (
    <RadixAvatar.Root
      role="img"
      aria-label={name}
      title={name}
      style={{ width: size, height: size, fontSize: size >= 30 ? 13 : 11.5 }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill select-none",
        className,
      )}
    >
      {src ? <RadixAvatar.Image src={src} alt="" className="size-full object-cover" /> : null}
      <RadixAvatar.Fallback
        delayMs={src ? 300 : undefined}
        className={cn("flex size-full items-center justify-center font-bold text-on-avatar", COLORS[index - 1])}
      >
        {initialsOf(name)}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}
