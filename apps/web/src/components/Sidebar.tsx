import { WEB_ROUTES } from "@board/shared";
import { Avatar, Button, Dialog, DialogContent, DialogTrigger, Logo } from "@board/ui";
import { FolderKanban, SquareCheckBig, Users, type LucideIcon } from "lucide-react";
import { NavLink } from "react-router";
import { ApiStatus } from "./ApiStatus";

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: WEB_ROUTES.PROJECTS, label: "Projects", icon: FolderKanban },
  { to: WEB_ROUTES.MY_CARDS, label: "My cards", icon: SquareCheckBig },
  { to: WEB_ROUTES.PEOPLE, label: "People", icon: Users },
];

const navLinkStyles =
  "flex min-h-11 items-center gap-2.5 rounded-9 px-3 text-button min-[900px]:min-h-9 text-ink hover:bg-surface-2 aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent";

/** Sidebar content. Rendered fixed on desktop and inside the drawer under 900px. */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center gap-2 px-2 font-display text-[17px]/6 font-bold">
        <Logo />
        Company Board
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
        {/* Placeholder until sign-in exists: the design shows the signed-in person here. */}
        <div className="flex w-full items-center gap-2.5 rounded-12 border border-line bg-surface-2 p-2.5">
          <Avatar name="Guest" size={34} />
          <div className="min-w-0">
            <strong className="block truncate text-button">Guest</strong>
            <p className="truncate text-body-small text-ink-muted">Not signed in</p>
          </div>
        </div>
      </div>
    </div>
  );
}
