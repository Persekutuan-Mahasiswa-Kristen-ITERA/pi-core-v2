import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** An empty block keeps its frame: one sentence, and the next step when there is one. */
export function EmptyState({
  title,
  children,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-pmk-control px-5 py-6", className)}>
      <p className="text-sm font-medium text-pmk-ink">{title}</p>
      {children ? <div className="mt-1 max-w-prose text-sm text-pmk-muted">{children}</div> : null}
    </div>
  );
}

export function ForbiddenState({ superAdmin = false }: { superAdmin?: boolean }) {
  return (
    <div className="max-w-lg py-10" role="alert">
      <h1 className="text-[22px] font-semibold text-pmk-ink">{superAdmin ? "Super admins only" : "Admins only"}</h1>
      <p className="mt-2 text-sm text-pmk-muted">
        {superAdmin
          ? "Changing the organization structure, roles and access levels is reserved for PI-CORE super admins."
          : "This part of PI-CORE is managed by PMK ITERA admins. Your own profile and assignments are under Profile."}
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex h-10 items-center rounded-full border border-pmk-control px-4 text-sm font-semibold text-pmk-ink hover:bg-pmk-tint"
      >
        Back to Home
      </Link>
    </div>
  );
}

/** Loading: the final layout with grey bars at the real sizes, so nothing jumps when data lands. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-6 lg:mb-8">
        <Skeleton className="h-7 w-48 rounded-md bg-pmk-tint" />
        <Skeleton className="mt-2.5 h-4 w-72 max-w-full rounded-md bg-pmk-tint" />
      </div>
      <div className="divide-y divide-pmk-rule overflow-hidden rounded-2xl border border-pmk-tint-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5 rounded bg-pmk-tint" />
              <Skeleton className="h-3 w-3/5 rounded bg-pmk-tint" />
            </div>
            <Skeleton className="h-4 w-16 rounded bg-pmk-tint" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="text-sm font-medium text-destructive">
      {messages[0]}
    </p>
  );
}
