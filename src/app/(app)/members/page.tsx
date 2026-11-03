import type { Metadata } from "next";
import Link from "next/link";
import { AddMemberIcon, DeactivateIcon, EditIcon, ReactivateIcon, SearchIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { MEMBERS_PAGE_SIZE, listMembers, listPeriods, listRoleOverview } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import {
  Avatar,
  LinkButton,
  PageHeader,
  RowList,
  RowListHead,
  Status,
  Tag,
  iconActionClass,
} from "@/components/common/surfaces";
import { EmptyState, ForbiddenState } from "@/components/common/states";
import { ConfirmAction } from "@/components/common/confirm-action";
import { MemberFilters } from "./member-filters";
import { deactivateMember, reactivateMember } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.members.title };
}

function param(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

const COLS = "md:grid-cols-[2.75rem_minmax(0,1.3fr)_minmax(0,1.4fr)_6.5rem_6.5rem_5.75rem]";

export default async function MembersPage({ searchParams }: PageProps<"/members">) {
  const { allowed, member: actor, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const { d } = await getI18n();

  const sp = await searchParams;
  const roleId = idSchema.safeParse(param(sp.role)).data;
  const periodId = idSchema.safeParse(param(sp.period)).data;
  const status = param(sp.status) === "inactive" ? "inactive" : "active";
  const page = Math.max(1, Number.parseInt(param(sp.page) ?? "1", 10) || 1);
  const q = param(sp.q);

  const [result, roles, periods] = await Promise.all([
    listMembers({ q, roleId, periodId, status, page }),
    listRoleOverview(),
    listPeriods(),
  ]);

  const pageHref = (n: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (roleId) next.set("role", roleId);
    if (periodId) next.set("period", periodId);
    if (status === "inactive") next.set("status", "inactive");
    if (n > 1) next.set("page", String(n));
    return `/members${next.size ? `?${next}` : ""}`;
  };

  const filtered = Boolean(q || roleId || periodId);
  const kind = status === "inactive" ? "deactivated" : filtered ? "matching" : "active";

  return (
    <>
      <PageHeader
        title={d.members.title}
        description={d.members.count(result.total, kind)}
        actions={
          <LinkButton href="/members/new" className="hidden sm:inline-flex">
            <AddMemberIcon aria-hidden /> {d.members.create}
          </LinkButton>
        }
      />
      <MemberFilters
        roles={roles.map((r) => ({ id: r.id!, label: r.name! }))}
        periods={periods.map((p) => ({ id: p.id, label: p.label }))}
      />
      <p className="sr-only" aria-live="polite">
        {d.members.srCount(result.total)}
      </p>
      {result.rows.length === 0 ? (
        <EmptyState
          icon={<SearchIcon />}
          title={
            filtered ? d.members.emptyMatch : status === "inactive" ? d.members.emptyDeactivated : d.members.emptyNone
          }
        >
          {filtered ? d.members.emptyMatchBody : status === "inactive" ? null : d.members.emptyNoneBody}
        </EmptyState>
      ) : (
        <>
          <RowListHead className={`gap-4 ${COLS}`}>
            <span />
            <span>{d.members.colName}</span>
            <span>{d.members.colPosition}</span>
            <span>{d.members.colPeriod}</span>
            <span>{d.members.status}</span>
            <span />
          </RowListHead>
          <RowList>
            {result.rows.map((m) => (
              <li
                key={m.id}
                className={`grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3 pl-4 pr-2 md:gap-x-4 md:py-2.5 ${COLS}`}
              >
                <Avatar name={m.fullName} className="row-span-2 self-start md:row-span-1 md:self-center" />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <Link
                      href={`/members/${m.id}`}
                      className="truncate text-base font-bold text-pmk-ink hover:underline focus-visible:outline-2 focus-visible:outline-pmk-accent"
                      title={m.email}
                    >
                      {m.fullName}
                    </Link>
                    {m.accessLevel === "super_admin" ? (
                      <Tag tone="gold">{d.access.super_admin}</Tag>
                    ) : m.isAdmin ? (
                      <Tag>{d.access.admin}</Tag>
                    ) : null}
                  </div>
                  <p className="truncate text-[13px] text-pmk-muted">{m.email}</p>
                </div>
                <div className="col-start-2 row-start-2 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 md:contents">
                  <span className="min-w-0 max-w-full md:block" title={m.assignment ?? undefined}>
                    {m.assignment ? (
                      <Tag tone="gold" className="max-w-full">
                        <span className="truncate">{m.assignment}</span>
                        {m.extraAssignments ? <span className="text-pmk-muted">+{m.extraAssignments}</span> : null}
                      </Tag>
                    ) : (
                      <Tag>{m.isLecturer ? d.memberType.lecturer : d.members.noAssignment}</Tag>
                    )}
                  </span>
                  <span className="tnum text-[13px] text-pmk-muted md:text-sm md:text-pmk-body">{m.period ?? "—"}</span>
                  <Status active={m.isActive}>{m.isActive ? d.common.active : d.common.deactivated}</Status>
                </div>
                <div className="row-span-2 flex items-center justify-end self-start md:row-span-1 md:self-center">
                  <Link href={`/members/${m.id}`} className={iconActionClass} aria-label={d.members.edit(m.fullName)}>
                    <EditIcon aria-hidden />
                  </Link>
                  {m.accessLevel === "super_admin" && !isSuperAdmin ? (
                    <span className="size-11" aria-hidden />
                  ) : m.isActive ? (
                    m.id === actor.id ? (
                      <span className="size-11" aria-hidden />
                    ) : (
                      <ConfirmAction
                        action={deactivateMember.bind(null, m.id)}
                        title={d.members.deactivateTitle(m.fullName)}
                        description={d.members.deactivateBody}
                        confirmLabel={d.members.deactivateConfirm}
                        destructive
                      >
                        <button type="button" className={iconActionClass} aria-label={d.members.deactivate(m.fullName)}>
                          <DeactivateIcon aria-hidden />
                        </button>
                      </ConfirmAction>
                    )
                  ) : (
                    <ConfirmAction
                      action={reactivateMember.bind(null, m.id)}
                      title={d.members.reactivateTitle(m.fullName)}
                      description={d.members.reactivateBody}
                      confirmLabel={d.members.reactivateConfirm}
                    >
                      <button type="button" className={iconActionClass} aria-label={d.members.reactivate(m.fullName)}>
                        <ReactivateIcon aria-hidden />
                      </button>
                    </ConfirmAction>
                  )}
                </div>
              </li>
            ))}
          </RowList>
        </>
      )}
      {result.pageCount > 1 ? (
        <nav aria-label={d.members.pagination} className="mt-5 flex items-center justify-between gap-3 text-sm">
          {result.page > 1 ? (
            <LinkButton href={pageHref(result.page - 1)} variant="secondary">
              {d.common.previous}
            </LinkButton>
          ) : (
            <span />
          )}
          <span className="tnum text-pmk-muted">
            {d.common.rangeOf(
              (result.page - 1) * MEMBERS_PAGE_SIZE + 1,
              Math.min(result.page * MEMBERS_PAGE_SIZE, result.total),
              result.total,
            )}
          </span>
          {result.page < result.pageCount ? (
            <LinkButton href={pageHref(result.page + 1)} variant="secondary">
              {d.common.next}
            </LinkButton>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
      <LinkButton
        href="/members/new"
        className="pmk-fab fixed bottom-[calc(92px+var(--safe-bottom))] right-5 z-30 h-12 sm:hidden"
      >
        <AddMemberIcon aria-hidden /> {d.members.create}
      </LinkButton>
    </>
  );
}
