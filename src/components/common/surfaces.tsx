import Link from "next/link";
import { cn } from "@/lib/utils";

/** Tinted card used for stat cards, role cards and list containers in the prototype. */
export function TintCard({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-pmk-tint-border bg-pmk-tint", className)} {...props} />;
}

/** Bordered white-ish container that wraps list rows (Members, Periods). */
export function ListPanel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-xl border border-pmk-tint-border/80 bg-pmk-cream p-3 sm:p-4", className)} {...props} />
  );
}

/** Rounded tinted list row. */
export function RowPill({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl bg-pmk-tint px-4 py-2.5 text-pmk-body", className)} {...props} />;
}

/** Full-width "Create X" action, styled like the prototype's tinted create bar. */
export function CreateBar({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-4 flex min-h-11 w-full items-center rounded-xl border-2 border-pmk-tint-border bg-pmk-tint px-6 text-sm font-medium text-pmk-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:border-pmk-accent/50 focus-visible:outline-2 focus-visible:outline-pmk-accent"
    >
      {children}
    </Link>
  );
}

export function SectionTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-lg font-bold tracking-[-0.45px] text-pmk-ink", className)} {...props} />;
}
