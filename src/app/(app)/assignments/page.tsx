import type { Metadata } from "next";
import Link from "next/link";
import { SquarePen, Trash2 } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { listActiveMembersForPicker, listAssignments, listPeriods, listRolesWithPositions } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ConfirmAction } from "@/components/common/confirm-action";
import { EmptyState, ForbiddenState } from "@/components/common/states";
import { RowPill } from "@/components/common/surfaces";
import { AssignmentForm } from "./assignment-form";
import { PeriodFilter } from "./period-filter";
import { createAssignment, deleteAssignment } from "./actions";

export const metadata: Metadata = { title: "Assignments" };

export default async function AssignmentsPage({ searchParams }: PageProps<"/assignments">) {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const sp = await searchParams;
  const [members, roles, periods] = await Promise.all([listActiveMembersForPicker(), listRolesWithPositions(), listPeriods()]);
  const activePeriod = periods.find((p) => p.is_active) ?? null;

  const requestedPeriod = typeof sp.period === "string" ? sp.period : undefined;
  const listPeriodId = requestedPeriod === "all" ? null : (idSchema.safeParse(requestedPeriod).data ?? activePeriod?.id ?? null);
  const assignments = await listAssignments(listPeriodId);
  const preselectedMember = idSchema.safeParse(typeof sp.member === "string" ? sp.member : undefined).data;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section aria-label="New assignment">
        <AssignmentForm
          mode="create"
          action={createAssignment}
          members={members.map((m) => ({ id: m.id, label: `${m.full_name} · ${m.email}` }))}
          roles={roles.map((r) => ({ id: r.id, name: r.name, positions: r.positions }))}
          periods={periods.map((p) => ({ id: p.id, label: p.is_active ? `${p.label} (active)` : p.label }))}
          defaults={{ memberId: preselectedMember, periodId: activePeriod?.id }}
        />
      </section>

      <section aria-labelledby="assignment-list" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="assignment-list" className="text-lg font-bold tracking-[-0.45px] text-pmk-ink">
            Assignments
          </h2>
          <PeriodFilter
            value={requestedPeriod === "all" ? "all" : (listPeriodId ?? "all")}
            periods={periods.map((p) => ({ id: p.id, label: p.label }))}
          />
        </div>
        {assignments.length === 0 ? (
          <EmptyState title="No assignments in this period">Use the form above to assign a member a role and position.</EmptyState>
        ) : (
          <ul className="space-y-2.5">
            {assignments.map((a) => (
              <li key={a.id}>
                <RowPill className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_auto] items-center gap-2 py-1 pl-4 pr-1 text-sm">
                  <span className="truncate font-medium text-pmk-ink" title={a.memberName}>
                    {a.memberName}
                    {!a.memberActive ? <span className="text-xs text-pmk-muted"> (inactive)</span> : null}
                  </span>
                  <span className="truncate" title={a.role}>{a.role}</span>
                  <span className="truncate" title={a.position}>{a.position}</span>
                  <span className="truncate">{a.period}</span>
                  <span className="flex">
                    <Link href={`/assignments/${a.id}`} className="grid size-11 place-items-center rounded-full text-pmk-brown hover:bg-white" aria-label={`Edit assignment of ${a.memberName}`}>
                      <SquarePen className="size-5" aria-hidden />
                    </Link>
                    <ConfirmAction
                      action={deleteAssignment.bind(null, a.id)}
                      title="Remove this assignment?"
                      description={`${a.memberName} will no longer hold ${a.role} · ${a.position} in ${a.period}.`}
                      confirmLabel="Remove"
                      destructive
                    >
                      <button type="button" className="grid size-11 place-items-center rounded-full text-pmk-brown hover:bg-white" aria-label={`Remove assignment of ${a.memberName}`}>
                        <Trash2 className="size-5" aria-hidden />
                      </button>
                    </ConfirmAction>
                  </span>
                </RowPill>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
