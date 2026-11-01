import type { Metadata } from "next";
import Link from "next/link";
import { Plus, SquarePen, UserRoundX, RotateCcw } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { MEMBERS_PAGE_SIZE, listMembers, listPeriods, listRoleOverview } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { LinkButton, PageHeader, RowList, Tag } from "@/components/common/surfaces";
import { EmptyState, ForbiddenState } from "@/components/common/states";
import { ConfirmAction } from "@/components/common/confirm-action";
import { MemberFilters } from "./member-filters";
import { deactivateMember, reactivateMember } from "./actions";

export const metadata: Metadata = { title: "Members" };

function param(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function MembersPage({ searchParams }: PageProps<"/members">) {
  const { allowed, member: actor, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;

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
  const iconButton =
    "grid size-10 place-items-center rounded-full text-pmk-muted transition-colors hover:bg-pmk-tint hover:text-pmk-ink focus-visible:outline-2 focus-visible:outline-pmk-accent";

  return (
    <>
      <PageHeader
        title="Members"
        description={`${result.total} ${status === "inactive" ? "deactivated" : filtered ? "matching" : "active"} member${result.total === 1 ? "" : "s"}`}
        actions={
          <LinkButton href="/members/new">
            <Plus aria-hidden /> Create Member
          </LinkButton>
        }
      />
      <MemberFilters
        roles={roles.map((r) => ({ id: r.id!, label: r.name! }))}
        periods={periods.map((p) => ({ id: p.id, label: p.label }))}
      />
      <p className="sr-only" aria-live="polite">
        {result.total} member{result.total === 1 ? "" : "s"}
      </p>
      {result.rows.length === 0 ? (
        <EmptyState
          title={filtered ? "No members match" : status === "inactive" ? "No deactivated members" : "No members yet"}
        >
          {filtered
            ? "Try another name or clear the filters."
            : status === "inactive"
              ? null
              : "Create the first member account."}
        </EmptyState>
      ) : (
        <>
          <div
            className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_6rem_5.5rem] gap-4 px-4 pb-2 text-xs text-pmk-muted md:grid"
            aria-hidden
          >
            <span>Name</span>
            <span>Position · Unit</span>
            <span>Period</span>
            <span />
          </div>
          <RowList>
            {result.rows.map((m) => (
              <li
                key={m.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2.5 pl-4 pr-2 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_6rem_5.5rem] md:gap-x-4"
              >
                <div className="min-w-0 md:contents">
                  <div className="flex min-w-0 items-center gap-2">
                    <Link
                      href={`/members/${m.id}`}
                      className="truncate text-sm font-medium text-pmk-ink hover:underline"
                      title={m.email}
                    >
                      {m.fullName}
                    </Link>
                    {m.accessLevel === "super_admin" ? (
                      <Tag tone="gold">Super admin</Tag>
                    ) : m.isAdmin ? (
                      <Tag>Admin</Tag>
                    ) : null}
                  </div>
                  <p
                    className="mt-0.5 truncate text-xs text-pmk-muted md:mt-0 md:text-sm md:text-pmk-body"
                    title={m.assignment ?? undefined}
                  >
                    {m.assignment ?? (m.isLecturer ? "Dosen" : "No assignment")}
                    {m.extraAssignments ? <span className="text-pmk-muted"> +{m.extraAssignments}</span> : null}
                    <span className="md:hidden"> · {m.period ?? "—"}</span>
                  </p>
                  <span className="tnum hidden text-sm text-pmk-body md:block">{m.period ?? "—"}</span>
                </div>
                <div className="flex items-center justify-end">
                  <Link href={`/members/${m.id}`} className={iconButton} aria-label={`Edit ${m.fullName}`}>
                    <SquarePen className="size-4" aria-hidden />
                  </Link>
                  {m.accessLevel === "super_admin" && !isSuperAdmin ? (
                    <span className="size-10" aria-hidden />
                  ) : m.isActive ? (
                    m.id === actor.id ? (
                      <span className="size-10" aria-hidden />
                    ) : (
                      <ConfirmAction
                        action={deactivateMember.bind(null, m.id)}
                        title={`Deactivate ${m.fullName}?`}
                        description="They will no longer be able to log in. Their profile and assignment history are kept and can be restored later."
                        confirmLabel="Deactivate"
                        destructive
                      >
                        <button type="button" className={iconButton} aria-label={`Deactivate ${m.fullName}`}>
                          <UserRoundX className="size-4" aria-hidden />
                        </button>
                      </ConfirmAction>
                    )
                  ) : (
                    <ConfirmAction
                      action={reactivateMember.bind(null, m.id)}
                      title={`Reactivate ${m.fullName}?`}
                      description="They will be able to log in again with their existing password."
                      confirmLabel="Reactivate"
                    >
                      <button type="button" className={iconButton} aria-label={`Reactivate ${m.fullName}`}>
                        <RotateCcw className="size-4" aria-hidden />
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
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          {result.page > 1 ? (
            <LinkButton href={pageHref(result.page - 1)} variant="secondary">
              Previous
            </LinkButton>
          ) : (
            <span />
          )}
          <span className="tnum text-pmk-muted">
            {(result.page - 1) * MEMBERS_PAGE_SIZE + 1}–{Math.min(result.page * MEMBERS_PAGE_SIZE, result.total)} of{" "}
            {result.total}
          </span>
          {result.page < result.pageCount ? (
            <LinkButton href={pageHref(result.page + 1)} variant="secondary">
              Next
            </LinkButton>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
