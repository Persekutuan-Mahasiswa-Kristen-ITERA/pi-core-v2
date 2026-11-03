import Link from "next/link";
import { ChevronLeftIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Building blocks for every screen, in the Stitch language: white paper cards with a warm 1px edge
 * and a whisper of shadow on a cream canvas, 20px radius for cards, 24px for the hero and sheets,
 * fully round actions and chips. Server-safe: no hooks here.
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
          className="pmk-press -ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-full pl-1.5 pr-3 text-[15px] font-semibold text-pmk-ink hover:bg-pmk-ink/5 focus-visible:outline-2 focus-visible:outline-pmk-accent"
        >
          <ChevronLeftIcon className="size-5" aria-hidden />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-[28px] font-extrabold leading-[1.15] tracking-[-0.02em] text-pmk-ink lg:text-[32px]">
            {title}
          </h1>
          {description ? <p className="mt-1.5 max-w-2xl text-[15px] text-pmk-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div> : null}
      </div>
    </div>
  );
}

export function SectionTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-[19px] font-bold tracking-[-0.01em] text-pmk-ink", className)} {...props} />;
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
    <div className={cn("mb-3 flex min-h-11 items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-baseline gap-2">
        <SectionTitle id={id}>{title}</SectionTitle>
        {meta ? <span className="tnum text-sm text-pmk-muted">{meta}</span> : null}
      </div>
      {action}
    </div>
  );
}

/** A warm panel: a quiet step off white, for summaries that sit beside a list. */
export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-[20px] border border-[#efe3bf] bg-pmk-tint p-5", className)} {...props} />;
}

/** White paper card with a 1px edge. */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-[20px] border border-pmk-tint-border bg-white shadow-[var(--pmk-shadow-card)]", className)}
      {...props}
    />
  );
}

/** Kept for older call sites: a raised panel. */
export const TintCard = Panel;

/** The hero card at the top of a home screen: gold light in a corner and a slow sweep of light. */
export function Hero({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("pmk-hero rounded-[24px] p-[22px] shadow-[var(--pmk-shadow-card)] lg:p-8", className)}
      {...props}
    />
  );
}

/**
 * A list of rows. On phones every row is its own card (as in the prototype); from md the rows join
 * into one card split by rules, which reads as a table. Rows fade up in a stagger.
 */
export function RowList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "pmk-rows flex flex-col gap-2.5",
        "[&>li]:overflow-hidden [&>li]:rounded-[20px] [&>li]:border [&>li]:border-pmk-tint-border [&>li]:bg-white [&>li]:shadow-[var(--pmk-shadow-card)]",
        "md:gap-0 md:overflow-hidden md:rounded-[20px] md:border md:border-pmk-tint-border md:bg-white md:shadow-[var(--pmk-shadow-card)]",
        "md:[&>li]:rounded-none md:[&>li]:border-0 md:[&>li]:shadow-none md:[&>li+li]:border-t md:[&>li+li]:border-pmk-rule",
        className,
      )}
      {...props}
    />
  );
}

/** Column labels above a RowList, desktop only (the rows stack on phones). */
export function RowListHead({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("hidden px-4 pb-2 text-[13px] font-semibold text-pmk-muted md:grid", className)}
      {...props}
    />
  );
}

/** One row of a RowList. */
export function RowPill({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-4 py-3.5 text-sm text-pmk-body", className)} {...props} />;
}

/** A row that is itself a link to the object, with a hover step. */
export function RowLink({ className, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "block px-4 py-3.5 text-sm text-pmk-body transition-colors hover:bg-pmk-tint focus-visible:bg-pmk-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pmk-accent active:bg-pmk-active",
        className,
      )}
      {...props}
    />
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-outline";

/** Shared look of every action: fully round, 44px+ tall, a press scale. */
export function actionClass(variant: Variant = "primary", className?: string) {
  return cn(
    "pmk-press inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pmk-accent disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-[18px] [&_svg]:shrink-0",
    variant === "primary" && "bg-pmk-brown text-white hover:bg-pmk-brown-hover",
    variant === "secondary" && "border-[1.5px] border-pmk-tint-border bg-white text-pmk-ink hover:bg-pmk-tint",
    variant === "ghost" && "px-3 text-pmk-accent hover:bg-pmk-tint",
    variant === "danger" && "bg-pmk-negative text-white hover:bg-[#9a3627]",
    variant === "danger-outline" &&
      "border-[1.5px] border-[#e9c9c2] bg-white text-pmk-negative hover:bg-pmk-negative-soft",
    className,
  );
}

/** A link styled as a button. One primary per screen. */
export function LinkButton({
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={actionClass(variant, className)} {...props} />;
}

/** Small round icon action in a row (edit, remove). */
export const iconActionClass =
  "pmk-press grid size-11 shrink-0 place-items-center rounded-full text-pmk-muted transition-colors hover:bg-pmk-tint hover:text-pmk-ink focus-visible:outline-2 focus-visible:outline-pmk-accent active:scale-90 [&_svg]:size-5";

/** Status chip beside a name. Gold is the role chip of the prototype. */
export function Tag({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: "neutral" | "gold" | "positive" | "negative" }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 flex-none items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold",
        tone === "neutral" && "border-pmk-tint-border bg-pmk-tint text-pmk-muted",
        tone === "gold" && "border-pmk-gold-line bg-pmk-gold-soft text-pmk-ink",
        tone === "positive" && "border-transparent bg-pmk-positive-soft text-pmk-positive",
        tone === "negative" && "border-transparent bg-pmk-negative-soft text-pmk-negative-ink",
        className,
      )}
      {...props}
    />
  );
}

/** "Active" with a pulsing dot (or a breathing one), the prototype's status mark. Text, not colour alone. */
export function Status({
  active = true,
  breathe = false,
  className,
  children,
}: {
  active?: boolean;
  breathe?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold",
        active ? "text-pmk-positive" : "text-pmk-muted",
        className,
      )}
    >
      <span aria-hidden className={cn("pmk-dot", active && (breathe ? "pmk-dot-breathe" : "pmk-dot-pulse"))} />
      {children}
    </span>
  );
}

/** Label on the left, value on the right, rows split by rules (Akun saya). */
export function KeyValueList({
  items,
  className,
}: {
  items: { label: string; value: React.ReactNode }[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "rounded-[20px] border border-pmk-tint-border bg-white px-5 shadow-[var(--pmk-shadow-card)]",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-baseline justify-between gap-4 border-pmk-rule py-3.5 [&+&]:border-t"
        >
          <dt className="shrink-0 text-[15px] text-pmk-muted">{item.label}</dt>
          <dd className="min-w-0 break-words text-right text-[15px] font-semibold text-pmk-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Initials in a circle. Brown or pale gold, chosen from the name so a person keeps their colour. */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const letters =
    name
      .replace(/^(Dr|Ir|Pdt)\.\s*/i, "")
      .replace(/,.*/, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  const alt = [...name].reduce((h, c) => h + c.charCodeAt(0), 0) % 2 === 1;
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold",
        alt ? "bg-pmk-gold-soft text-pmk-ink" : "bg-pmk-brown text-white",
        size === "sm" && "size-9 text-[13px]",
        size === "md" && "size-11 text-[15px]",
        size === "lg" && "size-24 text-[34px]",
        className,
      )}
    >
      {letters}
    </span>
  );
}

/** A pale gold circle holding an icon (role cards, quick actions, menu rows). */
export function IconBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn(
        "pmk-lift-icon grid size-11 shrink-0 place-items-center rounded-full bg-pmk-gold-soft text-pmk-ink [&_svg]:size-[22px]",
        className,
      )}
      {...props}
    />
  );
}
