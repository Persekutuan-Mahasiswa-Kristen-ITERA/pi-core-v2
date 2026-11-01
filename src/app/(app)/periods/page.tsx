import type { Metadata } from "next";
import Link from "next/link";
import { Plus, SquarePen } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { listPeriods } from "@/lib/queries";
import { LinkButton, PageHeader, RowList, Tag } from "@/components/common/surfaces";
import { EmptyState, ForbiddenState } from "@/components/common/states";
import { ConfirmAction } from "@/components/common/confirm-action";
import { setActivePeriod } from "./actions";

export const metadata: Metadata = { title: "Periods" };

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmtDate = (d: string | null) => (d ? dateFmt.format(new Date(`${d}T00:00:00`)) : null);

export default async function PeriodsPage() {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const periods = await listPeriods();
  const active = periods.find((p) => p.is_active);

  return (
    <>
      <PageHeader
        title="Periods"
        description={
          active
            ? `${active.label} is active. Dashboard numbers, roles and new assignments use it.`
            : "No active period. Set one so assignments and role counts have a year to belong to."
        }
        actions={
          <LinkButton href="/periods/new">
            <Plus aria-hidden /> Create Period
          </LinkButton>
        }
      />
      {periods.length === 0 ? (
        <EmptyState title="No periods yet">
          Create the first academic year. It becomes the active period automatically.
        </EmptyState>
      ) : (
        <RowList className="max-w-3xl">
          {periods.map((p) => {
            const from = fmtDate(p.starts_on);
            const to = fmtDate(p.ends_on);
            return (
              <li key={p.id} className="flex items-center gap-3 py-2.5 pl-4 pr-2">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="tnum text-sm font-medium text-pmk-ink">{p.label}</span>
                    {p.is_active ? <Tag tone="gold">Active</Tag> : null}
                  </p>
                  <p className="tnum mt-0.5 text-xs text-pmk-muted">
                    {from || to ? `${from ?? "—"} – ${to ?? "—"}` : "No dates set"}
                  </p>
                </div>
                {p.is_active ? null : (
                  <ConfirmAction
                    action={setActivePeriod.bind(null, p.id)}
                    title={`Set ${p.label} as the active period?`}
                    description="Dashboard numbers and role member counts will use this period. Only one period can be active."
                    confirmLabel="Set Active"
                  >
                    <button
                      type="button"
                      className="inline-flex h-9 items-center rounded-full border border-pmk-control px-3.5 text-sm font-medium text-pmk-ink hover:bg-pmk-tint"
                    >
                      Set Active
                    </button>
                  </ConfirmAction>
                )}
                <Link
                  href={`/periods/${p.id}`}
                  className="grid size-10 place-items-center rounded-full text-pmk-muted hover:bg-pmk-tint hover:text-pmk-ink"
                  aria-label={`Edit ${p.label}`}
                >
                  <SquarePen className="size-4" aria-hidden />
                </Link>
              </li>
            );
          })}
        </RowList>
      )}
    </>
  );
}
