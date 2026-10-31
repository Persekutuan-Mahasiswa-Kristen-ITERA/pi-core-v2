import {
  CalendarRange,
  ChartNoAxesColumnIncreasing,
  CircleUserRound,
  House,
  LayoutDashboard,
  Plug,
  Settings,
  ShieldHalf,
  UserRoundCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean; comingSoon?: boolean };

/** Drawer items, in prototype order (Frame 31). */
export const DRAWER_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: UsersRound, adminOnly: true },
  { href: "/roles", label: "Roles", icon: ShieldHalf, adminOnly: true },
  { href: "/periods", label: "Periods", icon: CalendarRange, adminOnly: true },
  { href: "/assignments", label: "Assignments", icon: UserRoundCheck, adminOnly: true },
  { href: "/integrations", label: "Integrations", icon: Plug, adminOnly: true, comingSoon: true },
  { href: "/settings", label: "Setting", icon: Settings, adminOnly: true },
  { href: "/profile", label: "Profile", icon: CircleUserRound },
];

/** Bottom navigation (Home, Directory, Reports, Profile). */
export const BOTTOM_ITEMS: (NavItem & { match: string[] })[] = [
  { href: "/", label: "Home", icon: House, match: ["/"] },
  {
    href: "/members",
    label: "Directory",
    icon: UsersRound,
    adminOnly: true,
    match: ["/members", "/roles", "/periods"],
  },
  { href: "/reports", label: "Reports", icon: ChartNoAxesColumnIncreasing, match: ["/reports"] },
  { href: "/profile", label: "Profile", icon: CircleUserRound, match: ["/profile"] },
];

const TITLES: [string, string][] = [
  ["/members", "Members"],
  ["/roles", "Roles"],
  ["/periods", "Periods"],
  ["/assignments", "Assignments"],
  ["/settings", "Settings"],
  ["/profile", "Profile"],
  ["/reports", "Reports"],
  ["/integrations", "Integrations"],
];

export function titleForPath(pathname: string) {
  for (const [prefix, title] of TITLES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return title;
  }
  return "Dashboard";
}

export function isActivePath(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)));
}
