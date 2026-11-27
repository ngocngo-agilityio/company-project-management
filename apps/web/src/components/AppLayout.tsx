import { Button, Dialog, DialogTrigger, DrawerContent } from "@board/ui";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet, useMatches } from "react-router";
import type { RouteHandle } from "../types";
import { SidebarContent } from "./Sidebar";

function isRouteHandle(handle: unknown): handle is RouteHandle {
  return typeof handle === "object" && handle !== null && "title" in handle && typeof handle.title === "string";
}

/** App shell: sidebar (a drawer under 900px), sticky top bar and the content area. */
export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const title =
    [...useMatches()]
      .reverse()
      .map((match) => match.handle)
      .find(isRouteHandle)?.title ?? "Company Board";

  return (
    <div className="min-h-dvh bg-bg text-ink min-[900px]:flex">
      <aside className="sticky top-0 hidden h-dvh w-sidebar shrink-0 border-r border-line bg-surface min-[900px]:block">
        <SidebarContent />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-(--z-sticky) flex min-h-14 items-center gap-3 border-b border-line bg-surface px-4 py-2">
          <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" aria-label="Open menu" className="size-11 p-0 min-[900px]:hidden">
                <Menu size={18} strokeWidth={1.8} aria-hidden />
              </Button>
            </DialogTrigger>
            <DrawerContent title="Menu">
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </DrawerContent>
          </Dialog>
          <p className="min-w-0 flex-1 truncate text-body font-semibold">{title}</p>
        </header>
        <main className="mx-auto w-full max-w-page flex-1 px-4 pt-5.5 pb-20">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
