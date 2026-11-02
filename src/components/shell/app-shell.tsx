"use client";

import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BOTTOM_ITEMS, NAV_GROUPS, isActivePath, type NavItem } from "./nav-config";
import { LogoutButton } from "./logout-button";

type Viewer = { fullName: string; accessLabel: string };
type Props = { isAdmin: boolean; isSuperAdmin: boolean; orgName: string; viewer: Viewer; children: React.ReactNode };

/*
 * Shell: one tinted frame (sidebar on desktop, top bar on phones) around a white sheet.
 * Desktop (lg, 1024+): 240px sidebar on the chrome tint; the sheet is inset 8px from the window's
 * top, right and bottom edges, 16px radius, 1px edge, no shadow. Content column max 1100px.
 * Phone and tablet: the sheet becomes the screen; a 52px top bar on the chrome tint and a bottom
 * bar with the most used screens. The rest of the navigation is in the menu sheet.
 */
export function AppShell({ isAdmin, isSuperAdmin, orgName, viewer, children }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const allowed = (i: NavItem) => (isAdmin || !i.adminOnly) && (isSuperAdmin || !i.superAdminOnly);
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter(allowed) })).filter((g) => g.items.length);
  const bottomItems = BOTTOM_ITEMS.filter(allowed);

  return (
    <div className="min-h-dvh bg-white lg:bg-pmk-cream lg:pl-60">
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col pt-[var(--safe-top)] lg:flex"
        aria-label="Main navigation"
      >
        <Brand orgName={orgName} className="px-5 pb-6 pt-6" />
        <NavGroups groups={groups} pathname={pathname} />
        <div className="mt-auto px-3 pb-4">
          <ViewerCard viewer={viewer} pathname={pathname} />
        </div>
      </aside>

      {/* Phone / tablet top bar */}
      <header className="sticky top-0 z-20 bg-pmk-cream pt-[var(--safe-top)] lg:hidden">
        <div className="flex h-[52px] items-center gap-1 pl-[max(0.25rem,var(--safe-left))] pr-[max(0.75rem,var(--safe-right))]">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="grid size-11 place-items-center rounded-full text-pmk-ink hover:bg-pmk-active focus-visible:outline-2 focus-visible:outline-pmk-accent"
            aria-label="Open menu"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <Link href="/" className="flex min-h-11 items-center gap-2 rounded-lg pr-2">
            <Image src="/brand/pmk-logo-96.png" alt="" width={28} height={28} />
            <span className="text-[15px] font-semibold text-pmk-ink">PI-CORE</span>
          </Link>
          <Link
            href="/profile"
            className="ml-auto grid size-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-pmk-accent"
            aria-label={`Profile of ${viewer.fullName}`}
          >
            <Initials name={viewer.fullName} />
          </Link>
        </div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="gap-0 border-none bg-pmk-cream p-0 pt-[var(--safe-top)] pb-[var(--safe-bottom)] data-[side=left]:w-[288px] data-[side=left]:max-w-[85vw] [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Move between PI-CORE screens</SheetDescription>
          <div className="flex items-center justify-between pr-2">
            <Brand orgName={orgName} className="px-5 py-4" />
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="grid size-11 shrink-0 place-items-center rounded-full text-pmk-ink hover:bg-pmk-active focus-visible:outline-2 focus-visible:outline-pmk-accent"
              aria-label="Close menu"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <NavGroups groups={groups} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            <div className="mt-auto px-3 pb-4 pt-6">
              <ViewerCard viewer={viewer} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* The sheet */}
      <div className="lg:min-h-[calc(100dvh-16px)] lg:py-2 lg:pr-2">
        <div className="min-h-[calc(100dvh-52px)] bg-white lg:min-h-[calc(100dvh-16px)] lg:rounded-2xl lg:border lg:border-pmk-tint-border">
          <main className="mx-auto w-full max-w-[1100px] px-4 pb-[calc(6rem+var(--safe-bottom))] pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-9">
            {children}
          </main>
        </div>
      </div>

      {/* Phone / tablet bottom bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-pmk-tint-border bg-white pb-[var(--safe-bottom)] lg:hidden"
      >
        <ul className="mx-auto flex max-w-xl">
          {bottomItems.map((item) => {
            const active = isActivePath(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pmk-accent",
                    active ? "text-pmk-ink" : "text-pmk-muted",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-14 place-items-center rounded-full transition-colors",
                      active ? "bg-pmk-active" : "group-active:bg-pmk-tint",
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden strokeWidth={active ? 2.2 : 1.8} />
                  </span>
                  <span className="relative">
                    {item.label}
                    <PendingDot />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function Brand({ orgName, className }: { orgName: string; className?: string }) {
  return (
    <Link href="/" className={cn("flex min-w-0 items-center gap-3", className)}>
      <Image src="/brand/pmk-logo-96.png" alt="" width={36} height={36} className="shrink-0" />
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold leading-tight text-pmk-ink">PI-CORE</span>
        <span className="block truncate text-xs leading-snug text-pmk-muted" title={orgName}>
          {orgName}
        </span>
      </span>
    </Link>
  );
}

function NavGroups({
  groups,
  pathname,
  onNavigate,
}: {
  groups: { label: string | null; items: NavItem[] }[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Sections" className="space-y-6 px-3">
      {groups.map((group) => (
        <div key={group.label ?? "main"}>
          {group.label ? <p className="mb-1.5 px-2.5 text-xs font-medium text-pmk-muted">{group.label}</p> : null}
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <NavRow item={item} active={isActivePath(pathname, item)} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavRow({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  if (item.comingSoon) {
    return (
      <span
        className="flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm text-pmk-muted"
        aria-disabled="true"
      >
        <Icon className="size-4" aria-hidden strokeWidth={1.8} />
        {item.label}
        <span className="ml-auto text-xs">Later</span>
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-pmk-accent",
        active ? "bg-pmk-active font-semibold text-pmk-ink" : "text-pmk-body hover:bg-pmk-active/60 hover:text-pmk-ink",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden strokeWidth={active ? 2.2 : 1.8} />
      {item.label}
      <PendingSpinner />
    </Link>
  );
}

function ViewerCard({ viewer, pathname, onNavigate }: { viewer: Viewer; pathname: string; onNavigate?: () => void }) {
  const active = isActivePath(pathname, { href: "/profile" });
  return (
    <div className="space-y-0.5">
      <Link
        href="/profile"
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-12 items-center gap-2.5 rounded-lg px-2 transition-colors focus-visible:outline-2 focus-visible:outline-pmk-accent",
          active ? "bg-pmk-active" : "hover:bg-pmk-active/60",
        )}
      >
        <Initials name={viewer.fullName} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-pmk-ink">{viewer.fullName}</span>
          <span className="block text-xs text-pmk-muted">{viewer.accessLabel}</span>
        </span>
      </Link>
      <LogoutButton />
    </div>
  );
}

export function Initials({ name, className }: { name: string; className?: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-pmk-gold-soft text-xs font-semibold text-pmk-gold-strong",
        className,
      )}
    >
      {letters || "?"}
    </span>
  );
}

/** Confirms a tap on a nav link while the next screen loads (only shows when it is not instant). */
function PendingSpinner() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "ml-auto size-3.5 rounded-full border-2 border-pmk-muted/40 border-t-pmk-ink transition-opacity",
        pending ? "animate-spin opacity-100" : "opacity-0",
      )}
    />
  );
}

function PendingDot() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "absolute -right-2.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-pmk-gold transition-opacity",
        pending ? "opacity-100" : "opacity-0",
      )}
    />
  );
}
