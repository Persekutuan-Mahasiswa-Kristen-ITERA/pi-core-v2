import {
  AssignmentsIcon,
  HomeIcon,
  IntegrationsIcon,
  MembersIcon,
  PeriodsIcon,
  ProfileIcon,
  RolesIcon,
  SettingsIcon,
  StructureIcon,
  type Icon,
} from "@/components/icons";
import type { Dict } from "@/lib/i18n/dictionaries";

/** Keys of the nav copy whose value is plain text (not a function such as profileOf). */
type NavKey = { [K in keyof Dict["nav"]]: Dict["nav"][K] extends string ? K : never }[keyof Dict["nav"]];

export type NavItem = {
  href: string;
  label: NavKey;
  icon: Icon;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  comingSoon?: boolean;
  /** Extra path prefixes that mark this item as current. */
  match?: string[];
};

export type NavGroup = { label: NavKey | null; items: NavItem[] };

/** Sidebar (desktop). */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/", label: "home", icon: HomeIcon }],
  },
  {
    label: "groupOrganization",
    items: [
      { href: "/members", label: "members", icon: MembersIcon, adminOnly: true },
      { href: "/assignments", label: "assignments", icon: AssignmentsIcon, adminOnly: true },
      { href: "/structure", label: "structure", icon: StructureIcon, adminOnly: true },
      { href: "/roles", label: "roles", icon: RolesIcon, adminOnly: true },
      { href: "/periods", label: "periods", icon: PeriodsIcon, adminOnly: true },
    ],
  },
  {
    label: "groupAdmin",
    items: [
      { href: "/settings", label: "settings", icon: SettingsIcon, adminOnly: true },
      { href: "/integrations", label: "integrations", icon: IntegrationsIcon, adminOnly: true, comingSoon: true },
    ],
  },
];

/** The four screens grouped under Direktori on phones (a segmented control above the page). */
export const DIRECTORY_ITEMS: NavItem[] = [
  { href: "/members", label: "members", icon: MembersIcon, adminOnly: true },
  { href: "/structure", label: "structure", icon: StructureIcon, adminOnly: true },
  { href: "/roles", label: "roles", icon: RolesIcon, adminOnly: true },
  { href: "/periods", label: "periods", icon: PeriodsIcon, adminOnly: true },
];

/** Floating tab bar on phones: the screens used most. Directory covers the four lists above. */
export const BOTTOM_ITEMS: NavItem[] = [
  { href: "/", label: "home", icon: HomeIcon },
  {
    href: "/members",
    label: "directory",
    icon: MembersIcon,
    adminOnly: true,
    match: ["/structure", "/roles", "/periods"],
  },
  { href: "/assignments", label: "assignments", icon: AssignmentsIcon, adminOnly: true },
  { href: "/profile", label: "profile", icon: ProfileIcon, match: ["/settings", "/integrations"] },
];

export function isActivePath(pathname: string, item: Pick<NavItem, "href" | "match">) {
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)));
}
