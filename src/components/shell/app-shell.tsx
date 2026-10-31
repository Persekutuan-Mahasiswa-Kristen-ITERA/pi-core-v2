"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { BOTTOM_ITEMS, DRAWER_ITEMS, isActivePath, titleForPath, type NavItem } from "./nav-config";

type Props = { isAdmin: boolean; orgName: string; children: React.ReactNode };

export function AppShell({ isAdmin, orgName, children }: Props) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerItems = DRAWER_ITEMS.filter((i) => isAdmin || !i.adminOnly);
  const bottomItems = BOTTOM_ITEMS.filter((i) => isAdmin || !i.adminOnly);
  const title = titleForPath(pathname);

  return (
    <div className="min-h-dvh lg:pl-[250px]">
      {/* Desktop: the drawer becomes a persistent sidebar. */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col bg-pmk-gold pt-[var(--safe-top)] lg:flex"
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3 px-4 py-6">
          <Image src="/brand/pmk-logo.png" alt="" width={44} height={44} unoptimized />
          <p className="text-sm font-bold leading-tight text-pmk-ink">{orgName}</p>
        </div>
        <DrawerList items={drawerItems} pathname={pathname} />
      </aside>

      <header className="sticky top-0 z-20 border-b border-pmk-tint-border/70 bg-pmk-cream/95 pt-[var(--safe-top)] backdrop-blur supports-[backdrop-filter]:bg-pmk-cream/85">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-2 pl-[max(0.5rem,var(--safe-left))] pr-[max(0.5rem,var(--safe-right))]">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="grid size-11 place-items-center rounded-full text-pmk-accent hover:bg-pmk-tint focus-visible:outline-2 focus-visible:outline-pmk-accent lg:invisible"
            aria-label="Open menu"
          >
            <Menu className="size-6" aria-hidden />
          </button>
          <h1 className="text-lg font-bold tracking-[-0.45px] text-pmk-ink">{title}</h1>
          <NotificationBell />
        </div>
      </header>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-[250px] max-w-[80vw] gap-0 border-none bg-pmk-gold p-0 pt-[var(--safe-top)] sm:max-w-[250px] [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Navigate between PI-CORE sections</SheetDescription>
          <div className="flex h-16 items-center px-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="grid size-11 place-items-center rounded-full text-pmk-accent hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-pmk-brown"
              aria-label="Close menu"
            >
              <Menu className="size-6" aria-hidden />
            </button>
          </div>
          <DrawerList items={drawerItems} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="mx-auto w-full max-w-5xl px-4 pb-[calc(6rem+var(--safe-bottom))] pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] pt-4 lg:pb-10">
        {children}
      </main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-pmk-tint-border/70 bg-pmk-cream pb-[var(--safe-bottom)] lg:hidden"
      >
        <ul className={cn("mx-auto grid max-w-lg", bottomItems.length === 4 ? "grid-cols-4" : "grid-cols-3")}>
          {bottomItems.map((item) => {
            const active = isActivePath(pathname, item.match);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium tracking-[0.3px] focus-visible:outline-2 focus-visible:outline-pmk-accent",
                    active ? "text-pmk-accent" : "text-pmk-muted",
                  )}
                >
                  <Icon className="size-6" aria-hidden strokeWidth={active ? 2.25 : 1.75} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function DrawerList({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1 px-2 pt-6">
      {items.map((item) => {
        if (item.comingSoon) {
          return (
            <li key={item.href}>
              <span
                className="flex min-h-11 cursor-not-allowed items-center justify-between rounded-lg px-2 text-lg font-semibold tracking-[-0.45px] text-pmk-ink/55"
                aria-disabled="true"
              >
                {item.label}
                <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-semibold tracking-normal text-pmk-ink/70">
                  Soon
                </span>
              </span>
            </li>
          );
        }
        const active = isActivePath(pathname, [item.href]);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center rounded-lg px-2 text-lg font-semibold tracking-[-0.45px] text-pmk-ink hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-pmk-brown",
                active && "bg-black/[0.07]",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function NotificationBell() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full text-pmk-accent hover:bg-pmk-tint focus-visible:outline-2 focus-visible:outline-pmk-accent"
          aria-label="Notifications"
        >
          <Bell className="size-6" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 text-sm">
        <p className="font-semibold text-pmk-ink">No notifications</p>
        <p className="mt-1 text-pmk-body">Notifications are planned for a later version of PI-CORE.</p>
      </PopoverContent>
    </Popover>
  );
}
