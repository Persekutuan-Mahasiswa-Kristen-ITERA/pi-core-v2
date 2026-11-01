import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/members", label: "Members" },
  { href: "/roles", label: "Roles" },
  { href: "/periods", label: "Periods" },
] as const;

/** Members | Roles | Periods. Per the prototype, the current tab is slate and the others are ink. */
export function DirectoryTabs({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Directory" className="mb-4">
      <ul className="flex items-center justify-between gap-2 sm:justify-start sm:gap-8">
        {TABS.map((tab) => {
          const active = tab.href === current;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center px-2 text-lg font-bold tracking-[-0.45px] focus-visible:outline-2 focus-visible:outline-pmk-accent",
                  active ? "text-pmk-muted" : "text-pmk-ink hover:text-pmk-accent",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
