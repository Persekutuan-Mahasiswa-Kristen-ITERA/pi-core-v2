"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon, PeriodsIcon, SearchIcon } from "@/components/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar } from "@/components/common/surfaces";
import { LanguageSwitch } from "@/components/common/language-switch";
import { SlidingSegment, segItemClass } from "@/components/common/sliding-segment";
import { useDict } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { BOTTOM_ITEMS, DIRECTORY_ITEMS, NAV_GROUPS, isActivePath, type NavItem } from "./nav-config";

type Viewer = { fullName: string; accessLabel: string };
type Props = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  orgName: string;
  activePeriod: string | null;
  viewer: Viewer;
  children: React.ReactNode;
};

/*
 * Shell, after the final Stitch prototype.
 * Desktop (lg, 1024+): a white 256px sidebar with the brand, grouped navigation and the language
 * switch; a frosted top bar with search, the active period, the bell and the viewer.
 * Phone and tablet: a frosted top bar (brand, bell, viewer), a segmented Direktori control above
 * the four directory lists, and a floating frosted tab bar with the screens used most.
 * The cream canvas runs behind everything; content sits on white cards.
 */
export function AppShell({ isAdmin, isSuperAdmin, orgName, activePeriod, viewer, children }: Props) {
  const pathname = usePathname();
  const d = useDict();
  const allowed = (i: NavItem) => (isAdmin || !i.adminOnly) && (isSuperAdmin || !i.superAdminOnly);
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter(allowed) })).filter((g) => g.items.length);
  const bottomItems = BOTTOM_ITEMS.filter(allowed);
  const directory = DIRECTORY_ITEMS.filter(allowed);
  const directoryIndex = directory.findIndex((i) => pathname === i.href);

  return (
    <div className="min-h-dvh bg-pmk-cream lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside
        className="pmk-enter-side sticky top-0 hidden h-dvh flex-col border-r border-pmk-tint-border bg-white px-4 pb-5 pt-[calc(1.25rem+var(--safe-top))] lg:flex"
        aria-label={d.nav.mainNav}
      >
        <Brand orgName={orgName} className="mb-2 border-b border-pmk-rule px-2 pb-5" />
        <NavGroups groups={groups} pathname={pathname} />
        <div className="mt-auto space-y-3 border-t border-pmk-rule px-2 pt-4">
          <LanguageSwitch compact />
          <p className="text-[13px] text-pmk-muted">
            {d.nav.version} <span className="tnum">0.1.0</span>
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <TopBar isAdmin={isAdmin} orgName={orgName} activePeriod={activePeriod} viewer={viewer} />

        <main className="pmk-page mx-auto w-full max-w-[1200px] px-5 pb-[calc(8rem+var(--safe-bottom))] pl-[max(1.25rem,var(--safe-left))] pr-[max(1.25rem,var(--safe-right))] pt-3 lg:px-10 lg:pb-14 lg:pt-5">
          {directoryIndex >= 0 && directory.length > 1 ? (
            <nav aria-label={d.nav.directory} className="mb-5 lg:hidden">
              <SlidingSegment current={directoryIndex} memoryKey="directory">
                {directory.map((item, i) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-seg-item
                    aria-current={i === directoryIndex ? "page" : undefined}
                    className={cn(segItemClass(i === directoryIndex), "px-1 text-[13px] min-[400px]:text-sm")}
                  >
                    {d.nav[item.label]}
                  </Link>
                ))}
              </SlidingSegment>
            </nav>
          ) : null}
          {children}
        </main>
      </div>

      {/* Phone / tablet floating tab bar */}
      <nav
        aria-label={d.nav.primary}
        className="pmk-frost-light pmk-enter-bottom fixed inset-x-3 bottom-[calc(10px+var(--safe-bottom))] z-40 mx-auto max-w-[520px] rounded-[24px] border border-pmk-tint-border/90 p-1.5 shadow-[var(--pmk-shadow-float)] lg:hidden"
      >
        <ul className="grid h-14" style={{ gridTemplateColumns: `repeat(${bottomItems.length}, minmax(0, 1fr))` }}>
          {bottomItems.map((item) => {
            const active = isActivePath(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "pmk-press flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] text-xs font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pmk-accent active:scale-[0.92]",
                    active ? "bg-pmk-gold-soft text-pmk-ink" : "text-pmk-muted hover:text-pmk-ink",
                  )}
                >
                  <Icon
                    className={cn("size-6", active && "pmk-nav-current-icon")}
                    weight={active ? "fill" : "regular"}
                    aria-hidden
                  />
                  <span className="relative">
                    {d.nav[item.label]}
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

function TopBar({
  isAdmin,
  orgName,
  activePeriod,
  viewer,
}: {
  isAdmin: boolean;
  orgName: string;
  activePeriod: string | null;
  viewer: Viewer;
}) {
  const d = useDict();
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    // "/" jumps to the search field on desktop, as in the prototype.
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      const input = searchRef.current;
      if (e.key !== "/" || !input || tag === "input" || tag === "textarea" || tag === "select") return;
      if (input.offsetParent === null) return; // hidden on phones
      e.preventDefault();
      input.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header
      className={cn(
        "pmk-frost pmk-enter-top sticky top-0 z-30 border-b pt-[var(--safe-top)] transition-colors",
        scrolled ? "border-pmk-tint-border" : "border-transparent",
      )}
    >
      <div className="flex h-16 items-center gap-2 pl-[max(1.25rem,var(--safe-left))] pr-[max(0.75rem,var(--safe-right))] lg:h-[72px] lg:gap-3.5 lg:px-10">
        <Brand orgName={orgName} compact className="lg:hidden" />
        {isAdmin ? (
          <form
            action="/members"
            method="get"
            role="search"
            className="hidden h-[46px] max-w-[440px] flex-1 items-center gap-2 rounded-full border border-pmk-tint-border bg-white px-4 focus-within:border-pmk-gold focus-within:ring-3 focus-within:ring-pmk-gold/20 lg:flex"
          >
            <SearchIcon className="size-5 shrink-0 text-pmk-muted" aria-hidden />
            <label htmlFor="top-search" className="sr-only">
              {d.nav.search}
            </label>
            <input
              ref={searchRef}
              id="top-search"
              name="q"
              type="search"
              autoComplete="off"
              placeholder={d.nav.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-pmk-ink outline-none placeholder:text-[#84735c]"
            />
            <kbd className="rounded-md border border-pmk-tint-border px-1.5 py-0.5 font-sans text-xs font-semibold text-pmk-muted">
              /
            </kbd>
          </form>
        ) : null}
        <span className="flex-1" />
        <PeriodChip label={activePeriod} href={isAdmin ? "/periods" : "/profile"} />
        <Bell />
        <ViewerLink viewer={viewer} />
      </div>
    </header>
  );
}

function PeriodChip({ label, href }: { label: string | null; href: string }) {
  const d = useDict();
  return (
    <Link
      href={href}
      className="pmk-press hidden h-10 items-center gap-1.5 rounded-full border border-pmk-gold-line bg-pmk-gold-soft px-3.5 text-sm font-semibold text-pmk-ink hover:bg-[#f6e7b9] focus-visible:outline-2 focus-visible:outline-pmk-accent lg:inline-flex"
    >
      <PeriodsIcon className="size-[18px]" aria-hidden />
      {label ? (
        <>
          {d.nav.activePeriod} <span className="tnum">{label}</span>
        </>
      ) : (
        d.nav.noActivePeriod
      )}
    </Link>
  );
}

/** PI-CORE sends no notifications yet; the bell says so instead of pretending. */
function Bell() {
  const d = useDict();
  const [ring, setRing] = useState(false);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-ring={ring}
          onClick={() => setRing(true)}
          onAnimationEnd={() => setRing(false)}
          aria-label={d.nav.notifications}
          className="pmk-bell pmk-press grid size-11 shrink-0 place-items-center rounded-full text-pmk-ink hover:bg-pmk-ink/5 focus-visible:outline-2 focus-visible:outline-pmk-accent active:scale-90"
        >
          <BellIcon className="size-[22px]" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 rounded-[20px] border border-pmk-tint-border bg-white p-4 shadow-[var(--pmk-shadow-float)] ring-0"
      >
        <p className="text-base font-bold text-pmk-ink">{d.nav.noNotifications}</p>
        <p className="text-sm text-pmk-muted">{d.nav.noNotificationsBody}</p>
      </PopoverContent>
    </Popover>
  );
}

function ViewerLink({ viewer }: { viewer: Viewer }) {
  const d = useDict();
  return (
    <Link
      href="/profile"
      aria-label={d.nav.profileOf(viewer.fullName)}
      className="pmk-press flex shrink-0 items-center gap-2.5 rounded-full p-1 hover:bg-pmk-ink/5 focus-visible:outline-2 focus-visible:outline-pmk-accent lg:pr-3"
    >
      <Avatar name={viewer.fullName} size="sm" />
      <span className="hidden min-w-0 lg:block">
        <span className="block max-w-[160px] truncate text-sm font-bold leading-tight text-pmk-ink">
          {viewer.fullName}
        </span>
        <span className="block text-xs text-pmk-muted">{viewer.accessLabel}</span>
      </span>
    </Link>
  );
}

function Brand({ orgName, compact = false, className }: { orgName: string; compact?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-pmk-accent",
        className,
      )}
    >
      <Image
        src="/brand/pmk-logo-96.png"
        alt=""
        width={compact ? 34 : 40}
        height={compact ? 34 : 40}
        className="pmk-brand-mark shrink-0"
      />
      <span className="min-w-0">
        <span className="block text-[17px] font-extrabold leading-tight tracking-[-0.01em] text-pmk-ink">PI-CORE</span>
        <span className="block max-w-[180px] truncate text-xs leading-snug text-pmk-muted" title={orgName}>
          {compact ? "PMK ITERA" : orgName}
        </span>
      </span>
    </Link>
  );
}

function NavGroups({
  groups,
  pathname,
}: {
  groups: { label: NavItem["label"] | null; items: NavItem[] }[];
  pathname: string;
}) {
  const d = useDict();
  return (
    <nav aria-label={d.nav.sections} className="space-y-5 overflow-y-auto py-2">
      {groups.map((group) => (
        <div key={group.label ?? "main"}>
          {group.label ? (
            <p className="mb-1.5 px-3 text-[13px] font-semibold text-pmk-muted">{d.nav[group.label] as string}</p>
          ) : null}
          <ul className="space-y-1">
            {group.items.map((item) => (
              <li key={item.href}>
                <NavRow item={item} active={isActivePath(pathname, item)} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const d = useDict();
  const Icon = item.icon;
  const label = d.nav[item.label] as string;
  if (item.comingSoon) {
    return (
      <span
        className="flex min-h-11 items-center gap-3 rounded-[14px] px-3 text-[15px] text-pmk-muted"
        aria-disabled="true"
      >
        <Icon className="size-5" aria-hidden />
        {label}
        <span className="ml-auto rounded-full border border-pmk-tint-border bg-pmk-tint px-2 py-0.5 text-[11px] font-semibold">
          {d.common.soon}
        </span>
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-[14px] px-3 text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-pmk-accent",
        active
          ? "bg-pmk-gold-soft font-bold text-pmk-ink"
          : "font-medium text-pmk-muted hover:bg-pmk-tint hover:text-pmk-ink",
      )}
    >
      <Icon
        className={cn("size-5 shrink-0", active && "pmk-nav-current-icon")}
        weight={active ? "fill" : "regular"}
        aria-hidden
      />
      {label}
      <PendingSpinner />
    </Link>
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
