import { Button, Dialog, DialogContent, DialogTrigger } from "@board/ui";
import { FolderKanban, SquareCheckBig, Users, type LucideIcon } from "lucide-react";
import { NavLink } from "react-router";
import { ApiStatus } from "./ApiStatus";

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/my-cards", label: "My cards", icon: SquareCheckBig },
  { to: "/people", label: "People", icon: Users },
];

const navLinkStyles =
  "flex min-h-11 items-center gap-2.5 rounded-9 px-3 text-button min-[900px]:min-h-9 text-ink hover:bg-surface-2 aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent";

/** Sidebar content. Rendered fixed on desktop and inside the drawer under 900px. */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="inline-flex size-(--logo) items-center justify-center rounded-7 bg-accent font-display text-caption text-on-accent"
        >
          CB
        </span>
        <span className="font-display text-heading-3">Company Board</span>
      </div>
      <nav aria-label="Main" className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-overline text-ink-muted uppercase">Workspace</p>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onNavigate} className={navLinkStyles}>
            <Icon size={18} strokeWidth={1.8} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col items-start gap-2">
        <ApiStatus />
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="min-h-11 min-[900px]:min-h-9">
              About
            </Button>
          </DialogTrigger>
          <DialogContent title="Company Board" description="Internal app to manage company projects." />
        </Dialog>
      </div>
    </div>
  );
}
