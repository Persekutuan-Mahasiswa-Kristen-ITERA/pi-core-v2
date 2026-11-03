import type { Metadata } from "next";
import Link from "next/link";
import { AssignmentsIcon, DeleteIcon, EditIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { listAssignments } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ConfirmAction } from "@/components/common/confirm-action";
import { EmptyState, ForbiddenState } from "@/components/common/states";
import {
  Avatar,
  PageHeader,
  RowList,
  RowListHead,
  SectionHeader,
  Tag,
  iconActionClass,
} from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { AssignmentForm } from "./assignment-form";
import { PeriodFilter } from "./period-filter";
import { getAssignmentFormOptions } from "./form-options";
import { createAssignment, deleteAssignment } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.assignments.title };
}

const COLS = "md:grid-cols-[2.75rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_5.5rem_5.75rem]";

export default async function AssignmentsPage({ searchParams }: PageProps<"/assignments">) {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const sp = await searchParams;
  const [options, { d }] = await Promise.all([getAssignmentFormOptions(), getI18n()]);
  const t = d.assignments;
  const activePeriodId = options.activePeriodId ?? null;

  const requestedPeriod = typeof sp.period === "string" ? sp.period : undefined;
  const listPeriodId = requestedPeriod === "all" ? null : (idSchema.safeParse(requestedPeriod).data ?? activePeriodId);
  const assignments = await listAssignments(listPeriodId);
  const preselectedMember = idSchema.safeParse(typeof sp.member === "string" ? sp.member : undefined).data;

  const listPeriodLabel = options.periods.find((p) => p.id === listPeriodId)?.plainLabel;

  return (
    <div className="space-y-8">
      <PageHeader title={t.title} description={t.description} className="mb-0 lg:mb-0" />
      <section aria-labelledby="new-assignment">
        <h2 id="new-assignment" className="sr-only">
          {t.newAssignment}
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
          title={listPeriodLabel ? t.listTitle(listPeriodLabel) : t.all}
          meta={assignments.length}
          action={
            <PeriodFilter
              value={requestedPeriod === "all" ? "all" : (listPeriodId ?? "all")}
              periods={options.periods.map((p) => ({ id: p.id, label: p.plainLabel }))}
            />
          }
        />
        {assignments.length === 0 ? (
          <EmptyState icon={<AssignmentsIcon />} title={t.emptyTitle}>
            {t.emptyBody}
          </EmptyState>
        ) : (
          <>
            <RowListHead className={`gap-4 ${COLS}`}>
              <span />
              <span>{t.colMember}</span>
              <span>{t.colPosition}</span>
              <span>{t.colUnit}</span>
              <span>{t.colPeriod}</span>
              <span />
            </RowListHead>
            <RowList>
              {assignments.map((a) => (
                <li
                  key={a.id}
                  className={`grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3 pl-4 pr-2 text-sm md:gap-x-4 md:py-2.5 ${COLS}`}
                >
                  <Avatar name={a.memberName} className="row-span-2 self-start md:row-span-1 md:self-center" />
                  <p className="min-w-0 truncate text-base font-bold text-pmk-ink" title={a.memberName}>
                    {a.memberName}
                    {!a.memberActive ? (
                      <span className="text-[13px] font-normal text-pmk-muted"> {t.inactiveMember}</span>
                    ) : null}
                  </p>
                  <div className="col-start-2 row-start-2 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 md:contents">
                    <span className="min-w-0 truncate font-semibold text-pmk-body md:block" title={a.position}>
                      {a.position}
                    </span>
                    <span className="min-w-0 max-w-full md:block" title={a.unit}>
                      <Tag tone="gold" className="max-w-full">
                        <span className="truncate">{a.unit}</span>
                      </Tag>
                    </span>
                    <span className="tnum text-[13px] text-pmk-muted md:text-sm md:text-pmk-body">{a.period}</span>
                  </div>
                  <div className="row-span-2 flex justify-end self-start md:row-span-1 md:self-center">
                    <Link href={`/assignments/${a.id}`} className={iconActionClass} aria-label={t.edit(a.memberName)}>
                      <EditIcon aria-hidden />
                    </Link>
                    <ConfirmAction
                      action={deleteAssignment.bind(null, a.id)}
                      title={t.removeTitle}
                      description={t.removeBody(a.memberName, a.position, a.unit, a.period)}
                      confirmLabel={t.removeConfirm}
                      destructive
                    >
                      <button type="button" className={iconActionClass} aria-label={t.remove(a.memberName)}>
                        <DeleteIcon aria-hidden />
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
