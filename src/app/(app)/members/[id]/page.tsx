import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { getMember, listAssignmentsForMember } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/common/confirm-action";
import { EmptyState, ForbiddenState } from "@/components/common/states";
import { RowPill, SectionTitle } from "@/components/common/surfaces";
import { deactivateMember, reactivateMember, resetMemberPassword, updateMember } from "../actions";
import { MemberForm } from "../member-form";
import { ResetPassword } from "./reset-password";

export const metadata: Metadata = { title: "Edit member" };

export default async function EditMemberPage({ params }: PageProps<"/members/[id]">) {
  const { allowed, member: actor, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [member, assignments] = await Promise.all([getMember(id.data), listAssignmentsForMember(id.data)]);
  if (!member) notFound();
  const isSelf = member.id === actor.id;
  // Only a super admin edits a super admin's account (RLS enforces the same).
  const locked = member.access_level === "super_admin" && !isSuperAdmin;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <section className="space-y-4">
        <Link
          href="/members"
          className="inline-flex min-h-11 items-center text-sm font-medium text-pmk-accent hover:underline"
        >
          ← All members
        </Link>
        <SectionTitle>{member.full_name}</SectionTitle>
        {!member.is_active ? (
          <p role="status" className="rounded-xl bg-pmk-tint px-4 py-3 text-sm font-medium text-pmk-ink">
            Deactivated — this member cannot log in.
          </p>
        ) : member.must_change_password ? (
          <p className="text-sm text-pmk-body">Has not chosen a personal password yet.</p>
        ) : null}
        {locked ? (
          <div className="space-y-2 rounded-xl bg-pmk-tint px-4 py-3 text-sm text-pmk-body">
            <p className="font-semibold text-pmk-ink">Super admin account</p>
            <p className="break-all">{member.email}</p>
            <p>Only another super admin can edit, deactivate or reset this account.</p>
          </div>
        ) : (
          <MemberForm
            mode="edit"
            action={updateMember.bind(null, member.id)}
            canSetAccess={isSuperAdmin && !isSelf}
            defaults={{
              fullName: member.full_name,
              email: member.email,
              nim: member.nim,
              phone: member.phone,
              accessLevel: member.access_level,
            }}
          />
        )}
      </section>

      <section className="space-y-3" aria-labelledby="assignments-title">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle id="assignments-title">Assignments</SectionTitle>
          {member.is_active ? (
            <Link
              href={`/assignments?member=${member.id}`}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-pmk-accent hover:underline"
            >
              + Assign
            </Link>
          ) : null}
        </div>
        {assignments.length === 0 ? (
          <EmptyState title="No assignments" />
        ) : (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/assignments/${a.id}`}
                  className="block rounded-xl focus-visible:outline-2 focus-visible:outline-pmk-accent"
                >
                  <RowPill className="grid grid-cols-3 gap-2 text-sm hover:bg-pmk-tint-border/60">
                    <span className="font-medium text-pmk-ink">{a.position}</span>
                    <span>{a.unit}</span>
                    <span className="text-right">
                      {a.period}
                      {a.activePeriod ? <span className="sr-only"> (active period)</span> : null}
                    </span>
                  </RowPill>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isSelf && !locked ? (
        <section className="space-y-3" aria-labelledby="account-title">
          <SectionTitle id="account-title">Account</SectionTitle>
          <div className="flex flex-wrap gap-3">
            {member.is_active ? (
              <>
                <ResetPassword name={member.full_name} action={resetMemberPassword.bind(null, member.id)} />
                <ConfirmAction
                  action={deactivateMember.bind(null, member.id)}
                  title={`Deactivate ${member.full_name}?`}
                  description="They will no longer be able to log in. Their profile and assignment history are kept and can be restored later."
                  confirmLabel="Deactivate"
                  destructive
                >
                  <Button variant="destructive" className="h-11 rounded-full px-5">
                    Deactivate member
                  </Button>
                </ConfirmAction>
              </>
            ) : (
              <ConfirmAction
                action={reactivateMember.bind(null, member.id)}
                title={`Reactivate ${member.full_name}?`}
                description="They will be able to log in again with their existing password."
                confirmLabel="Reactivate"
              >
                <Button className="h-11 rounded-full px-5">Reactivate member</Button>
              </ConfirmAction>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
