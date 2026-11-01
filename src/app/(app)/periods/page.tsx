import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Circle, SquarePen } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { listPeriods } from "@/lib/queries";
import { DirectoryTabs } from "@/components/common/directory-tabs";
import { CreateBar, ListPanel, RowPill } from "@/components/common/surfaces";
import { EmptyState, ForbiddenState } from "@/components/common/states";
import { ConfirmAction } from "@/components/common/confirm-action";
import { setActivePeriod } from "./actions";

export const metadata: Metadata = { title: "Periods" };

export default async function PeriodsPage() {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const periods = await listPeriods();

  return (
    <>
      <DirectoryTabs current="/periods" />
      <CreateBar href="/periods/new">Create Period</CreateBar>
      <ListPanel>
        {periods.length === 0 ? (
          <EmptyState title="No periods yet">
            Create the first academic year. It becomes the active period automatically.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {periods.map((p) => (
              <li key={p.id}>
                <RowPill className="flex items-center gap-3 py-3">
                  {p.is_active ? (
                    <CircleCheck className="size-5 shrink-0 text-pmk-gold-strong" aria-hidden />
                  ) : (
                    <Circle className="size-5 shrink-0 text-pmk-gold-strong" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-pmk-body">{p.label}</p>
                    {p.is_active ? (
                      <p className="text-sm font-semibold text-pmk-gold-strong">Active</p>
                    ) : (
                      <ConfirmAction
                        action={setActivePeriod.bind(null, p.id)}
                        title={`Set ${p.label} as the active period?`}
                        description="Dashboard numbers and role member counts will use this period. Only one period can be active."
                        confirmLabel="Set Active"
                      >
                        <button
                          type="button"
                          className="-my-2 min-h-11 text-left text-sm text-pmk-body underline-offset-4 hover:text-pmk-ink hover:underline"
                        >
                          Set Active
                        </button>
                      </ConfirmAction>
                    )}
                  </div>
                  <Link
                    href={`/periods/${p.id}`}
                    className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-bold text-[#8791a0] hover:text-pmk-ink"
                    aria-label={`Edit ${p.label}`}
                  >
                    <SquarePen className="size-5 text-pmk-brown" aria-hidden />
                    Edit
                  </Link>
                </RowPill>
              </li>
            ))}
          </ul>
        )}
      </ListPanel>
    </>
  );
}
