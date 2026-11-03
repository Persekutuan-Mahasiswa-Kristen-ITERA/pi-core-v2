import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { LockIcon } from "@/components/icons";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { actionClass } from "./surfaces";

export { FieldError } from "./field-error";

/** An empty block keeps its frame: one sentence, and the next step when there is one. */
export function EmptyState({
  title,
  children,
  icon,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-[20px] border-[1.5px] border-dashed border-[#dccb9e] px-5 py-8 text-center",
        className,
      )}
    >
      {icon ? <span className="text-pmk-muted [&_svg]:size-8">{icon}</span> : null}
      <p className="text-[15px] font-semibold text-pmk-ink">{title}</p>
      {children ? <div className="max-w-prose text-sm text-pmk-muted">{children}</div> : null}
    </div>
  );
}

export async function ForbiddenState({ superAdmin = false }: { superAdmin?: boolean }) {
  const { d } = await getI18n();
  return (
    <div className="max-w-lg py-10" role="alert">
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-pmk-gold-soft text-pmk-ink">
        <LockIcon className="size-6" aria-hidden />
      </span>
      <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-pmk-ink">
        {superAdmin ? d.states.superAdminsOnly : d.states.adminsOnly}
      </h1>
      <p className="mt-2 text-[15px] text-pmk-muted">
        {superAdmin ? d.states.superAdminsOnlyBody : d.states.adminsOnlyBody}
      </p>
      <Link href="/" className={actionClass("secondary", "mt-6")}>
        {d.states.backHome}
      </Link>
    </div>
  );
}

const bar = "rounded-md bg-[#efe9dd]";

/** Loading: the final layout with warm bars at the real sizes, so nothing jumps when data lands. */
export async function ListSkeleton({ rows = 6 }: { rows?: number }) {
  const { d } = await getI18n();
  return (
    <div aria-busy="true" aria-label={d.common.loading}>
      <div className="mb-6 lg:mb-8">
        <Skeleton className={cn("h-8 w-48", bar)} />
        <Skeleton className={cn("mt-3 h-4 w-72 max-w-full", bar)} />
      </div>
      <div className="flex flex-col gap-2.5 md:gap-0 md:overflow-hidden md:rounded-[20px] md:border md:border-pmk-tint-border md:bg-white">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-[20px] border border-pmk-tint-border bg-white px-4 py-3.5 md:rounded-none md:border-0 md:[&+&]:border-t md:[&+&]:border-pmk-rule"
          >
            <Skeleton className="size-11 shrink-0 rounded-full bg-[#efe9dd]" />
            <div className="flex-1 space-y-2">
              <Skeleton className={cn("h-4 w-2/5", bar)} />
              <Skeleton className={cn("h-3 w-3/5", bar)} />
            </div>
            <Skeleton className={cn("h-6 w-20 rounded-full", bar)} />
          </div>
        ))}
      </div>
    </div>
  );
}
