import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { getActivePeriod, listRoleOverview } from "@/lib/queries";
import { LinkButton, PageHeader, RowList, Tag } from "@/components/common/surfaces";
import { EmptyState, ForbiddenState } from "@/components/common/states";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const { allowed, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const [roles, activePeriod] = await Promise.all([listRoleOverview(), getActivePeriod()]);

  return (
    <>
      <PageHeader
        title="Roles"
        description={`What a position lets its holder do. Holders are counted in ${activePeriod ? `the active period, ${activePeriod.label}` : "the active period"}.`}
        actions={
          isSuperAdmin ? (
            <LinkButton href="/roles/new">
              <Plus aria-hidden /> Create Role
            </LinkButton>
          ) : null
        }
      />
      {roles.length === 0 ? (
        <EmptyState title="No roles yet">Roles come from the migrations; a super admin can add more.</EmptyState>
      ) : (
        <div className="max-w-3xl">
          <div
            className="hidden grid-cols-[minmax(0,1fr)_6rem_6rem_1rem] gap-4 px-4 pb-2 text-xs text-pmk-muted sm:grid"
            aria-hidden
          >
            <span>Role</span>
            <span className="text-right">Positions</span>
            <span className="text-right">Holders</span>
            <span />
          </div>
          <RowList>
            {roles.map((role) => (
              <li key={role.id}>
                <Link
                  href={`/roles/${role.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto_1rem] items-center gap-x-4 px-4 py-3 transition-colors hover:bg-pmk-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pmk-accent sm:grid-cols-[minmax(0,1fr)_6rem_6rem_1rem]"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-pmk-ink">{role.name}</span>
                      {role.grants_admin ? <Tag tone="gold">Admin access</Tag> : null}
                    </span>
                    {role.description ? (
                      <span className="mt-0.5 block truncate text-xs text-pmk-muted">{role.description}</span>
                    ) : null}
                  </span>
                  <span className="tnum hidden text-right text-sm text-pmk-body sm:block">{role.position_count}</span>
                  <span className="tnum text-right text-sm text-pmk-ink">
                    {role.active_member_count}
                    <span className="text-pmk-muted sm:hidden"> holders</span>
                  </span>
                  <ChevronRight className="size-4 text-pmk-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </RowList>
        </div>
      )}
    </>
  );
}
