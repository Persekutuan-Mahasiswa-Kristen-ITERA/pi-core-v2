import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SquarePen, Trash2, UsersRound } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { getRoleDetail } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ConfirmAction } from "@/components/common/confirm-action";
import { EmptyState, ForbiddenState } from "@/components/common/states";
import { RowPill, TintCard } from "@/components/common/surfaces";
import { deleteRole } from "../actions";

export const metadata: Metadata = { title: "Role" };

export default async function RoleDetailPage({ params }: PageProps<"/roles/[id]">) {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const detail = await getRoleDetail(id.data);
  if (!detail) notFound();
  const { role, members, activePeriod } = detail;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href="/roles" className="inline-flex min-h-11 items-center text-sm font-medium text-pmk-accent hover:underline">
        ← All roles
      </Link>
      <TintCard className="p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-pmk-ink">
          <UsersRound className="size-5 text-pmk-accent" aria-hidden />
          {role.name}
        </p>
        <p className="mt-3 text-sm text-pmk-body">Total Members{activePeriod ? ` · ${activePeriod.label}` : ""}</p>
        <p className="text-3xl font-bold text-pmk-ink">{role.active_member_count}</p>
      </TintCard>

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
                  <span className="text-right text-sm">{m.position}</span>
                </RowPill>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex min-h-11 items-center justify-between rounded-xl border-2 border-pmk-tint-border bg-pmk-tint px-2">
        <Link href={`/roles/${role.id}/edit`} className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-medium text-pmk-ink hover:underline">
          <SquarePen className="size-5 text-pmk-brown" aria-hidden />
          Edit Role
        </Link>
        <ConfirmAction
          action={deleteRole.bind(null, role.id!)}
          title={`Delete role ${role.name}?`}
          description="The role and its unused positions will be deleted. This cannot be undone."
          confirmLabel="Delete Role"
          destructive
          redirectTo="/roles"
          blockedReason={
            role.assignment_count
              ? `${role.name} still has ${role.assignment_count} assignment(s) across all periods. Remove them under Assignments before deleting the role.`
              : undefined
          }
        >
          <button type="button" className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-medium text-pmk-ink hover:underline">
            Delete Role
            <Trash2 className="size-5 text-pmk-brown" aria-hidden />
          </button>
        </ConfirmAction>
      </div>
    </div>
  );
}
