import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SquarePen, Trash2, UsersRound } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { UNIT_TYPE_LABEL } from "@/lib/org-structure";
import { getRoleDetail } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ConfirmAction } from "@/components/common/confirm-action";
import { EmptyState, ForbiddenState } from "@/components/common/states";
import { RowPill, TintCard } from "@/components/common/surfaces";
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
    <div className="mx-auto max-w-xl space-y-5">
      <Link
        href="/roles"
        className="inline-flex min-h-11 items-center text-sm font-medium text-pmk-accent hover:underline"
      >
        ← All roles
      </Link>
      <TintCard className="p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-pmk-ink">
          <UsersRound className="size-5 text-pmk-accent" aria-hidden />
          {role.name}
        </p>
        {role.grants_admin ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-pmk-accent">
            Gives admin access in the active period
          </p>
        ) : null}
        <p className="mt-3 text-sm text-pmk-body">Total Members{activePeriod ? ` · ${activePeriod.label}` : ""}</p>
        <p className="text-3xl font-bold text-pmk-ink">{role.active_member_count}</p>
      </TintCard>

      <section aria-labelledby="role-positions" className="space-y-2">
        <h2 id="role-positions" className="text-sm font-bold text-pmk-ink">
          Positions with this role
        </h2>
        {positions.length === 0 ? (
          <p className="text-sm text-pmk-body">
            No position carries this role yet. A super admin sets this per position under Structure.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {positions.map((p) => (
              <li key={p.id} className="rounded-full bg-pmk-tint px-3 py-1.5 text-sm text-pmk-ink">
                {p.name} <span className="text-xs text-pmk-body">· {UNIT_TYPE_LABEL[p.unit_type]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="role-members" className="rounded-xl border-2 border-pmk-tint/80 bg-pmk-cream p-4">
        <h2 id="role-members" className="text-sm font-bold text-pmk-ink">
          {role.name}
        </h2>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-pmk-muted">Details</p>
        {role.description ? <p className="mb-3 text-sm text-pmk-body">{role.description}</p> : null}
        {!activePeriod ? (
          <EmptyState title="No active period">Set an active period to see who holds this role.</EmptyState>
        ) : members.length === 0 ? (
          <EmptyState title="Nobody holds this role yet">Assign members under Assignments.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {members.map((m) => (
              <li key={m.assignmentId}>
                <RowPill className="flex items-center justify-between gap-3">
                  <Link href={`/members/${m.memberId}`} className="font-medium text-pmk-ink hover:underline">
                    {m.fullName}
                  </Link>
                  <span className="text-right text-sm">
                    {m.position}
                    <span className="block text-xs text-pmk-muted">{m.unit}</span>
                  </span>
                </RowPill>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isSuperAdmin ? (
        <div className="flex min-h-11 items-center justify-between rounded-xl border-2 border-pmk-tint-border bg-pmk-tint px-2">
          <Link
            href={`/roles/${role.id}/edit`}
            className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-medium text-pmk-ink hover:underline"
          >
            <SquarePen className="size-5 text-pmk-brown" aria-hidden />
            Edit Role
          </Link>
          {role.is_system ? (
            <span className="px-2 text-xs text-pmk-body">System role · cannot be deleted</span>
          ) : (
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
                className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-medium text-pmk-ink hover:underline"
              >
                Delete Role
                <Trash2 className="size-5 text-pmk-brown" aria-hidden />
              </button>
            </ConfirmAction>
          )}
        </div>
      ) : null}
    </div>
  );
}
