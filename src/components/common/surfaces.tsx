import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Building blocks for every screen. Surfaces are separated by a 1px edge or one tone step, never a
 * shadow. Radii: 16px for cards and panels, 10px for controls, full round for buttons and tags.
 */

/** The screen's title row: optional back link, the h1, one line about the data, actions on the right. */
export function PageHeader({
  title,
  description,
  back,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 lg:mb-8", className)}>
      {back ? (
        <Link
          href={back.href}
          className="-ml-1.5 mb-2 inline-flex min-h-9 items-center gap-1 rounded-md pr-2 text-sm font-medium text-pmk-muted hover:text-pmk-ink focus-visible:outline-2 focus-visible:outline-pmk-accent"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.01em] text-pmk-ink lg:text-2xl">
            {title}
          </h1>
          {description ? <p className="mt-1.5 max-w-2xl text-sm text-pmk-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function SectionTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-base font-semibold text-pmk-ink", className)} {...props} />;
}

/** Section heading with an optional action on its right ("View all", "Add"). */
export function SectionHeader({
  id,
  title,
  meta,
  action,
  className,
}: {
  id?: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex min-h-9 items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-baseline gap-2">
        <SectionTitle id={id}>{title}</SectionTitle>
        {meta ? <span className="tnum text-sm text-pmk-muted">{meta}</span> : null}
      </div>
      {action}
    </div>
  );
}

/** A raised panel one tone step off white. Holds its title and content directly. */
export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-2xl bg-pmk-tint p-5", className)} {...props} />;
}

/** White card with a 1px edge. */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-pmk-tint-border bg-white", className)} {...props} />;
}

/** Kept for older call sites: a raised panel. */
export const TintCard = Panel;

/** A list of rows inside one bordered card, split by row rules. */
export function RowList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "divide-y divide-pmk-rule overflow-hidden rounded-2xl border border-pmk-tint-border bg-white",
        className,
      )}
      {...props}
    />
  );
}

/** One row of a RowList. */
export function RowPill({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-4 py-3 text-sm text-pmk-body", className)} {...props} />;
}

/** A row that is itself a link to the object, with a hover step. */
export function RowLink({ className, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "block px-4 py-3 text-sm text-pmk-body transition-colors hover:bg-pmk-tint focus-visible:bg-pmk-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pmk-accent",
        className,
      )}
      {...props}
    />
  );
}

const linkButtonBase =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pmk-accent [&_svg]:size-4";

/** A link styled as a button. One primary per screen. */
export function LinkButton({
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <Link
      className={cn(
        linkButtonBase,
        variant === "primary" && "bg-pmk-brown text-white hover:bg-pmk-brown-hover",
        variant === "secondary" && "border border-pmk-control bg-white text-pmk-ink hover:bg-pmk-tint",
        variant === "ghost" && "px-2.5 text-pmk-accent hover:bg-pmk-tint",
        className,
      )}
      {...props}
    />
  );
}

/** Small status tag beside a name: pale tint, dark text of the same hue. */
export function Tag({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: "neutral" | "gold" | "positive" | "negative" }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 flex-none items-center whitespace-nowrap rounded-full px-2 text-xs font-medium",
        tone === "neutral" && "bg-pmk-active text-pmk-body",
        tone === "gold" && "bg-pmk-gold-soft text-pmk-gold-strong",
        tone === "positive" && "bg-[#dcfae5] text-[#0b4a26]",
        tone === "negative" && "bg-[#ffedea] text-[#831c1e]",
        className,
      )}
      {...props}
    />
  );
}

/** Label/value pairs (profile, member summary). */
export function DefinitionGrid({
  items,
  className,
}: {
  items: { label: string; value: React.ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3", className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-pmk-muted">{item.label}</dt>
          <dd className="mt-0.5 truncate text-sm font-medium text-pmk-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
