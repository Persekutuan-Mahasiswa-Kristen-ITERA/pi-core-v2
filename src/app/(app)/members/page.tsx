import type { Metadata } from "next";
import Link from "next/link";
import { SquarePen, Trash2, RotateCcw } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { listMembers, listPeriods, listRoleOverview } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { DirectoryTabs } from "@/components/common/directory-tabs";
import { CreateBar, ListPanel, RowPill } from "@/components/common/surfaces";
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

  return (
    <>
      <DirectoryTabs current="/members" />
      <CreateBar href="/members/new">Create Member</CreateBar>
      <ListPanel className="space-y-3">
        <MemberFilters
          roles={roles.map((r) => ({ id: r.id!, label: r.name! }))}
          periods={periods.map((p) => ({ id: p.id, label: p.label }))}
        />
        <p className="px-2 text-xs text-pmk-body" aria-live="polite">
          {result.total} {status === "inactive" ? "deactivated " : ""}member{result.total === 1 ? "" : "s"}
        </p>
        {result.rows.length === 0 ? (
          <EmptyState
            title={
              q || roleId || periodId
                ? "No members match"
                : status === "inactive"
                  ? "No deactivated members"
                  : "No members yet"
            }
          >
            {q || roleId || periodId
              ? "Try another name or clear the filters."
              : status === "inactive"
                ? null
                : "Create the first member account."}
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {result.rows.map((m) => (
              <li key={m.id}>
                {/* Phones: name over "role · period" (real names do not fit three columns at 390px).
                    sm and up: the prototype's three columns. */}
                <RowPill className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-1.5 pl-4 pr-1 text-sm sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] sm:text-base">
                  <span className="min-w-0 sm:contents">
                    <Link
                      href={`/members/${m.id}`}
                      className="block truncate font-medium text-pmk-ink hover:underline"
                      title={m.email}
                    >
                      {m.fullName}
                      {m.accessLevel === "super_admin" ? (
                        <span className="ml-1 text-[11px] font-semibold text-pmk-accent">SUPER ADMIN</span>
                      ) : m.isAdmin ? (
                        <span className="ml-1 text-[11px] font-semibold text-pmk-accent">ADMIN</span>
                      ) : null}
                    </Link>
                    <span className="block truncate text-xs sm:text-[inherit]" title={m.assignment ?? undefined}>
                      {m.assignment ?? "No assignment"}
                      {m.extraAssignments ? <span className="text-pmk-muted"> +{m.extraAssignments}</span> : null}
                      <span className="sm:hidden"> · {m.period ?? "—"}</span>
                    </span>
                    <span className="hidden truncate sm:block">{m.period ?? "—"}</span>
                  </span>
                  <span className="flex items-center">
                    <Link
                      href={`/members/${m.id}`}
                      className="grid size-11 place-items-center rounded-full text-pmk-brown hover:bg-white"
                      aria-label={`Edit ${m.fullName}`}
                    >
                      <SquarePen className="size-5" aria-hidden />
                    </Link>
                    {m.accessLevel === "super_admin" && !isSuperAdmin ? (
                      <span className="size-11" aria-hidden />
                    ) : m.isActive ? (
                      m.id === actor.id ? (
                        <span className="size-11" aria-hidden />
                      ) : (
                        <ConfirmAction
                          action={deactivateMember.bind(null, m.id)}
                          title={`Deactivate ${m.fullName}?`}
                          description="They will no longer be able to log in. Their profile and assignment history are kept and can be restored later."
                          confirmLabel="Deactivate"
                          destructive
                        >
                          <button
                            type="button"
                            className="grid size-11 place-items-center rounded-full text-pmk-brown hover:bg-white"
                            aria-label={`Deactivate ${m.fullName}`}
                          >
                            <Trash2 className="size-5" aria-hidden />
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
                        <button
                          type="button"
                          className="grid size-11 place-items-center rounded-full text-pmk-brown hover:bg-white"
                          aria-label={`Reactivate ${m.fullName}`}
                        >
                          <RotateCcw className="size-5" aria-hidden />
                        </button>
                      </ConfirmAction>
                    )}
                  </span>
                </RowPill>
              </li>
            ))}
          </ul>
        )}
        {result.pageCount > 1 ? (
          <nav aria-label="Pagination" className="flex items-center justify-between pt-1 text-sm">
            {result.page > 1 ? (
              <Link
                href={pageHref(result.page - 1)}
                className="inline-flex min-h-11 items-center px-3 font-semibold text-pmk-accent"
              >
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-pmk-body">
              Page {result.page} of {result.pageCount}
            </span>
            {result.page < result.pageCount ? (
              <Link
                href={pageHref(result.page + 1)}
                className="inline-flex min-h-11 items-center px-3 font-semibold text-pmk-accent"
              >
                Next →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </ListPanel>
    </>
  );
}
