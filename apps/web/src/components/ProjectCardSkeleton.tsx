import { Skeleton } from "@board/ui";

/**
 * Placeholder shown in place of a ProjectCard while the project list loads.
 *
 * Why it exists: if the page showed a spinner or tiny blocks, the cards would push everything down
 * when the data arrives (layout shift). So this mirrors ProjectCard part by part, with the same
 * outer box, padding and gaps, to take about the same height.
 *
 * Keep it in step with ProjectCard.tsx: when a part is added to or removed from the card, change it here too.
 */
export function ProjectCardSkeleton() {
  return (
    // Same box as the real card: border, radius, padding (p-4.5) and the gap between parts (gap-3.5).
    // aria-hidden: it is decoration. The list around it (see Projects.tsx) announces "Loading projects".
    <li aria-hidden="true" className="flex flex-col gap-3.5 rounded-12 border border-line bg-surface p-4.5 shadow-sm">
      {/* Part 1, header: the initials square, then the project name and "Your role: ..." lines. */}
      <div className="flex items-center gap-3">
        {/* Same size (size-10.5) and radius as the initials square. */}
        <Skeleton className="size-10.5 shrink-0 rounded-12" />
        <div className="flex flex-1 flex-col gap-1.5">
          {/* Name line: a bit shorter than the box (2/3) so it reads like text, not a bar. */}
          <Skeleton className="h-4 w-2/3" />
          {/* Role line: shorter again (1/2). */}
          <Skeleton className="h-3.5 w-1/2" />
        </div>
      </div>

      {/* Part 2, the three number tiles (open cards, overdue, boards): same 3-column grid, h-13 ~ 52px per tile. */}
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-13" />
        <Skeleton className="h-13" />
        <Skeleton className="h-13" />
      </div>

      {/* Part 3, the member avatars: one pill the height of an avatar (size-6.5), wide enough for a few. */}
      <Skeleton className="size-6.5 w-24 rounded-pill" />

      {/* Part 4, the buttons (Open board, Archive project): h-8 is the "sm" button height. */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-7" />
        <Skeleton className="h-8 w-28 rounded-7" />
      </div>
    </li>
  );
}
