import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SquarePen, Trash2 } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { UNIT_TYPE_LABEL } from "@/lib/org-structure";
import { getRoleDetail } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ConfirmAction } from "@/components/common/confirm-action";
import { EmptyState, ForbiddenState } from "@/components/common/states";
import { PageHeader, Panel, RowList, SectionHeader, Tag } from "@/components/common/surfaces";
import { deleteRole } from "../actions";

export const metadata: Metadata = { title: "Role" };

export default async function RoleDetailPage({ params }: PageProps<"/roles/[id]">) {
  const { allowed, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const detail = await getRoleDetail(id.data);
  if (!detail) notFound();
  const { role, members, positions, activePeriod } = detail;

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {role.name}
            {role.grants_admin ? <Tag tone="gold">Admin access</Tag> : null}
          </span>
        }
        description={
          role.description ??
          (role.grants_admin ? "Holders get admin access in PI-CORE while the period is active." : undefined)
        }
        back={{ href: "/roles", label: "Roles" }}
        actions={
          isSuperAdmin ? (
            <>
              <Link
                href={`/roles/${role.id}/edit`}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-pmk-control bg-white px-4 text-sm font-semibold text-pmk-ink hover:bg-pmk-tint"
              >
                <SquarePen className="size-4" aria-hidden />
                Edit Role
              </Link>
              {role.is_system ? null : (
                <ConfirmAction
                  action={deleteRole.bind(null, role.id!)}
                  title={`Delete role ${role.name}?`}
                  description="Positions lose this role; assignments are not touched. This cannot be undone."
                  confirmLabel="Delete Role"
                  destructive
                  redirectTo="/roles"
                >
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-destructive hover:bg-[#ffedea]"
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Delete Role
                  </button>
                </ConfirmAction>
              )}
            </>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
        <section aria-labelledby="role-members" className="lg:col-span-8">
          <SectionHeader
            id="role-members"
            title="Holders"
            meta={activePeriod ? `${role.active_member_count} in ${activePeriod.label}` : undefined}
          />
          {!activePeriod ? (
            <EmptyState title="No active period">Set an active period to see who holds this role.</EmptyState>
          ) : members.length === 0 ? (
            <EmptyState title="Nobody holds this role yet">Assign members under Assignments.</EmptyState>
          ) : (
            <RowList>
              {members.map((m) => (
                <li key={m.assignmentId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <Link href={`/members/${m.memberId}`} className="truncate font-medium text-pmk-ink hover:underline">
                    {m.fullName}
                  </Link>
                  <span className="min-w-0 text-right">
                    <span className="block truncate text-pmk-body">{m.position}</span>
                    <span className="block truncate text-xs text-pmk-muted">{m.unit}</span>
                  </span>
                </li>
              ))}
            </RowList>
          )}
        </section>

        <section aria-labelledby="role-positions" className="lg:col-span-4">
          <SectionHeader id="role-positions" title="Positions with this role" />
          <Panel className="text-sm">
            {positions.length === 0 ? (
              <p className="text-pmk-muted">
                No position carries this role yet. A super admin sets this per position under Structure.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {positions.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-3">
                    <span className="text-pmk-ink">{p.name}</span>
                    <span className="text-xs text-pmk-muted">{UNIT_TYPE_LABEL[p.unit_type]}</span>
                  </li>
                ))}
              </ul>
            )}
            {role.is_system ? (
              <p className="mt-4 border-t border-pmk-tint-border pt-3 text-xs text-pmk-muted">
                System role · cannot be deleted
              </p>
            ) : null}
          </Panel>
        </section>
      </div>
    </div>
  );
}
