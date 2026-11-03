import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon, ChevronRightIcon, EditIcon, PeriodsIcon, PlusIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { listPeriods } from "@/lib/queries";
import { LinkButton, PageHeader, actionClass, iconActionClass } from "@/components/common/surfaces";
import { EmptyState, ForbiddenState } from "@/components/common/states";
import { ConfirmAction } from "@/components/common/confirm-action";
import { cn } from "@/lib/utils";
import { setActivePeriod } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.periods.title };
}

export default async function PeriodsPage() {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const [periods, { d, date }] = await Promise.all([listPeriods(), getI18n()]);
  const t = d.periods;
  const active = periods.find((p) => p.is_active);
  const fmtDate = (v: string | null) => (v ? date.format(new Date(`${v}T00:00:00`)) : null);

  return (
    <>
      <PageHeader
        title={t.title}
        description={active ? t.descriptionActive(active.label) : t.descriptionNone}
        actions={
          <LinkButton href="/periods/new">
            <PlusIcon aria-hidden /> {t.create}
          </LinkButton>
        }
      />
      {periods.length === 0 ? (
        <EmptyState icon={<PeriodsIcon />} title={t.emptyTitle}>
          {t.emptyBody}
        </EmptyState>
      ) : (
        <ul className="pmk-stagger grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
          {periods.map((p) => {
            const from = fmtDate(p.starts_on);
            const to = fmtDate(p.ends_on);
            return (
              <li
                key={p.id}
                className={cn(
                  "flex flex-col gap-2.5 rounded-[20px] border bg-white px-[18px] pb-3.5 pt-[18px] shadow-[var(--pmk-shadow-card)]",
                  p.is_active ? "border-[#e6cf85] bg-pmk-on-deep" : "border-pmk-tint-border",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="tnum text-[22px] font-extrabold tracking-[-0.01em] text-pmk-ink">{p.label}</p>
                    <p className="tnum text-sm text-pmk-muted">
                      {from || to ? `${from ?? "—"} – ${to ?? "—"}` : t.noDates}
                    </p>
                  </div>
                  {p.is_active ? (
                    <span className="inline-flex h-[30px] items-center gap-1 rounded-full bg-pmk-positive-soft px-3 text-[13px] font-bold text-pmk-positive">
                      <CheckIcon className="size-4" weight="bold" aria-hidden />
                      {d.common.active}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-pmk-rule pt-2.5">
                  {p.is_active ? (
                    <LinkButton href="/assignments" variant="ghost" className="-ml-3">
                      {t.viewAssignments}
                      <ChevronRightIcon className="pmk-arrow" aria-hidden />
                    </LinkButton>
                  ) : (
                    <ConfirmAction
                      action={setActivePeriod.bind(null, p.id)}
                      title={t.setActiveTitle(p.label)}
                      description={t.setActiveBody}
                      confirmLabel={t.setActive}
                    >
                      <button type="button" className={actionClass("secondary", "h-10 px-4 text-sm")}>
                        {t.setActive}
                      </button>
                    </ConfirmAction>
                  )}
                  <Link href={`/periods/${p.id}`} className={iconActionClass} aria-label={t.edit(p.label)}>
                    <EditIcon aria-hidden />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
