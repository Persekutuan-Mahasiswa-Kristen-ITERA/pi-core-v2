import type { Metadata } from "next";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { getActivePeriod, listRoleOverview } from "@/lib/queries";
import { DirectoryTabs } from "@/components/common/directory-tabs";
import { CreateBar } from "@/components/common/surfaces";
import { EmptyState, ForbiddenState } from "@/components/common/states";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const { allowed, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const [roles, activePeriod] = await Promise.all([listRoleOverview(), getActivePeriod()]);

  return (
    <>
      <DirectoryTabs current="/roles" />
      {isSuperAdmin ? <CreateBar href="/roles/new">Create Role</CreateBar> : null}
      <p className="mb-3 text-xs text-pmk-body">
        Total Members counts active members whose position carries the role in the active period
        {activePeriod ? ` (${activePeriod.label})` : ""}.
      </p>
      {roles.length === 0 ? (
        <EmptyState title="No roles yet">Roles come from the migrations; a super admin can add more.</EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {roles.map((role) => (
            <li key={role.id}>
              <Link
                href={`/roles/${role.id}`}
                className="flex h-full min-h-[136px] flex-col rounded-xl border border-pmk-tint-border bg-pmk-tint p-5 hover:border-pmk-accent/50 focus-visible:outline-2 focus-visible:outline-pmk-accent"
              >
                <span className="flex items-start gap-2">
                  <UsersRound className="mt-0.5 size-5 shrink-0 text-pmk-accent" aria-hidden />
                  <span className="text-sm font-medium uppercase text-pmk-ink">{role.name}</span>
                </span>
                {role.grants_admin ? (
                  <span className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-pmk-accent">
                    Admin access
                  </span>
                ) : null}
                <span className="mt-auto pt-3 text-sm text-pmk-body">Total Members</span>
                <span className="text-2xl font-bold text-pmk-ink">{role.active_member_count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
