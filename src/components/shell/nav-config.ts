import {
  CalendarRange,
  CircleUserRound,
  House,
  Network,
  Plug,
  Settings,
  ShieldHalf,
  UserRoundCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  comingSoon?: boolean;
  /** Extra path prefixes that mark this item as current. */
  match?: string[];
};

export type NavGroup = { label: string | null; items: NavItem[] };

/** Sidebar (desktop) and menu sheet (phone). */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/", label: "Home", icon: House }],
  },
  {
    label: "Organization",
    items: [
      { href: "/members", label: "Members", icon: UsersRound, adminOnly: true },
      { href: "/assignments", label: "Assignments", icon: UserRoundCheck, adminOnly: true },
      { href: "/structure", label: "Structure", icon: Network, adminOnly: true },
      { href: "/roles", label: "Roles", icon: ShieldHalf, adminOnly: true },
      { href: "/periods", label: "Periods", icon: CalendarRange, adminOnly: true },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
      { href: "/integrations", label: "Integrations", icon: Plug, adminOnly: true, comingSoon: true },
    ],
  },
];

/** Bottom bar on phones: the screens used most. Everything else is in the menu sheet. */
export const BOTTOM_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/members", label: "Members", icon: UsersRound, adminOnly: true },
  { href: "/assignments", label: "Assign", icon: UserRoundCheck, adminOnly: true },
  { href: "/structure", label: "Structure", icon: Network, adminOnly: true },
  { href: "/profile", label: "Profile", icon: CircleUserRound },
];

export function isActivePath(pathname: string, item: Pick<NavItem, "href" | "match">) {
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)));
}
