import type { Metadata } from "next";
import Link from "next/link";
import { SquarePen, Trash2 } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { listAssignments } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ConfirmAction } from "@/components/common/confirm-action";
import { EmptyState, ForbiddenState } from "@/components/common/states";
import { PageHeader, RowList, SectionHeader } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { AssignmentForm } from "./assignment-form";
import { PeriodFilter } from "./period-filter";
import { getAssignmentFormOptions } from "./form-options";
import { createAssignment, deleteAssignment } from "./actions";

export const metadata: Metadata = { title: "Assignments" };

export default async function AssignmentsPage({ searchParams }: PageProps<"/assignments">) {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const sp = await searchParams;
  const options = await getAssignmentFormOptions();
  const activePeriodId = options.activePeriodId ?? null;

  const requestedPeriod = typeof sp.period === "string" ? sp.period : undefined;
  const listPeriodId = requestedPeriod === "all" ? null : (idSchema.safeParse(requestedPeriod).data ?? activePeriodId);
  const assignments = await listAssignments(listPeriodId);
  const preselectedMember = idSchema.safeParse(typeof sp.member === "string" ? sp.member : undefined).data;

  const listPeriodLabel = options.periods.find((p) => p.id === listPeriodId)?.label.replace(" (active)", "");
  const iconButton =
    "grid size-10 place-items-center rounded-full text-pmk-muted transition-colors hover:bg-pmk-tint hover:text-pmk-ink focus-visible:outline-2 focus-visible:outline-pmk-accent";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assignments"
        description="Who holds which position, in which unit, for which period."
        className="mb-0 lg:mb-0"
      />
      <section aria-labelledby="new-assignment">
        <h2 id="new-assignment" className="sr-only">
          New assignment
        </h2>
        <FormCard>
          <AssignmentForm
            mode="create"
            action={createAssignment}
            members={options.members}
            units={options.units}
            positions={options.positions}
            periods={options.periods}
            defaults={{ memberId: preselectedMember, periodId: options.activePeriodId }}
          />
        </FormCard>
      </section>

      <section aria-labelledby="assignment-list">
        <SectionHeader
          id="assignment-list"
          title={listPeriodLabel ? `Pengurus ${listPeriodLabel}` : "All assignments"}
          meta={assignments.length}
          action={
            <PeriodFilter
              value={requestedPeriod === "all" ? "all" : (listPeriodId ?? "all")}
              periods={options.periods.map((p) => ({ id: p.id, label: p.label.replace(" (active)", "") }))}
            />
          }
        />
        {assignments.length === 0 ? (
          <EmptyState title="No assignments in this period">
            Use the form above to give a member a position in a unit.
          </EmptyState>
        ) : (
          <>
            <div
              className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.3fr)_5.5rem_5.5rem] gap-4 px-4 pb-2 text-xs text-pmk-muted md:grid"
              aria-hidden
            >
              <span>Member</span>
              <span>Position</span>
              <span>Unit</span>
              <span>Period</span>
              <span />
            </div>
            <RowList>
              {assignments.map((a) => (
                <li
                  key={a.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2.5 pl-4 pr-2 text-sm md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.3fr)_5.5rem_5.5rem] md:gap-x-4"
                >
                  <div className="min-w-0 md:contents">
                    <p className="truncate font-medium text-pmk-ink" title={a.memberName}>
                      {a.memberName}
                      {!a.memberActive ? <span className="text-xs font-normal text-pmk-muted"> (inactive)</span> : null}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-pmk-muted md:hidden">
                      {a.position} · {a.unit} · {a.period}
                    </p>
                    <span className="hidden truncate text-pmk-body md:block" title={a.position}>
                      {a.position}
                    </span>
                    <span className="hidden truncate text-pmk-body md:block" title={a.unit}>
                      {a.unit}
                    </span>
                    <span className="tnum hidden text-pmk-body md:block">{a.period}</span>
                  </div>
                  <div className="flex justify-end">
                    <Link
                      href={`/assignments/${a.id}`}
                      className={iconButton}
                      aria-label={`Edit assignment of ${a.memberName}`}
                    >
                      <SquarePen className="size-4" aria-hidden />
                    </Link>
                    <ConfirmAction
                      action={deleteAssignment.bind(null, a.id)}
                      title="Remove this assignment?"
                      description={`${a.memberName} will no longer hold ${a.position} · ${a.unit} in ${a.period}.`}
                      confirmLabel="Remove"
                      destructive
                    >
                      <button type="button" className={iconButton} aria-label={`Remove assignment of ${a.memberName}`}>
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </ConfirmAction>
                  </div>
                </li>
              ))}
            </RowList>
          </>
        )}
      </section>
    </div>
  );
}
