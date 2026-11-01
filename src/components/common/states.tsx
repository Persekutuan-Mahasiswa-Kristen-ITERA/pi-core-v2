import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";

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
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed border-pmk-tint-border px-6 py-10 text-center",
        className,
      )}
    >
      <p className="font-semibold text-pmk-ink">{title}</p>
      {children ? <div className="max-w-sm text-sm text-pmk-body">{children}</div> : null}
    </div>
  );
}

export function ForbiddenState({ superAdmin = false }: { superAdmin?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center" role="alert">
      <ShieldAlert className="size-10 text-pmk-accent" aria-hidden />
      <p className="text-lg font-bold text-pmk-ink">{superAdmin ? "Super admins only" : "Admins only"}</p>
      <p className="max-w-sm text-sm text-pmk-body">
        {superAdmin
          ? "Changing the organization structure, roles and access levels is reserved for PI-CORE super admins."
          : "This part of PI-CORE is managed by PMK ITERA admins. Your own profile and assignments are under Profile."}
      </p>
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-11 w-full rounded-xl bg-pmk-tint" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-xl bg-pmk-tint" />
      ))}
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
