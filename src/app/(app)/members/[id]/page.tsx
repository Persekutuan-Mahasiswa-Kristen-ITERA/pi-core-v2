import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { getMember, listAssignmentsForMember } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/common/confirm-action";
import { EmptyState, ForbiddenState } from "@/components/common/states";
import { LinkButton, PageHeader, RowLink, RowList, SectionHeader, Tag } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
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

  const typeLabel = member.member_type === "lecturer" ? "Dosen" : "Mahasiswa";

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {member.full_name}
            {member.access_level === "super_admin" ? <Tag tone="gold">Super admin</Tag> : null}
            {member.access_level === "admin" ? <Tag>Admin</Tag> : null}
            {!member.is_active ? <Tag tone="negative">Deactivated</Tag> : null}
          </span>
        }
        description={
          <span className="break-all">
            {typeLabel} · {member.email}
            {member.must_change_password && member.is_active ? " · has not chosen a personal password yet" : ""}
          </span>
        }
        back={{ href: "/members", label: "Members" }}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
        <section aria-labelledby="details-title" className="lg:col-span-7">
          <SectionHeader id="details-title" title="Details" />
          {!member.is_active ? (
            <p role="status" className="mb-4 rounded-[10px] bg-pmk-tint px-4 py-3 text-sm font-medium text-pmk-ink">
              Deactivated — this member cannot log in.
            </p>
          ) : null}
          {locked ? (
            <FormCard className="space-y-1 text-sm text-pmk-muted">
              <p className="font-medium text-pmk-ink">Super admin account</p>
              <p>Only another super admin can edit, deactivate or reset this account.</p>
            </FormCard>
          ) : (
            <FormCard>
              <MemberForm
                mode="edit"
                action={updateMember.bind(null, member.id)}
                canSetAccess={isSuperAdmin && !isSelf}
                defaults={{
                  memberType: member.member_type,
                  fullName: member.full_name,
                  email: member.email,
                  nim: member.nim,
                  nip: member.nip,
                  phone: member.phone,
                  accessLevel: member.access_level,
                }}
              />
            </FormCard>
          )}
        </section>

        <div className="space-y-8 lg:col-span-5">
          <section aria-labelledby="assignments-title">
            <SectionHeader
              id="assignments-title"
              title="Assignments"
              meta={assignments.length || undefined}
              action={
                member.is_active && member.member_type === "student" ? (
                  <LinkButton href={`/assignments?member=${member.id}`} variant="ghost">
                    + Assign
                  </LinkButton>
                ) : null
              }
            />
            {assignments.length === 0 ? (
              <EmptyState title="No assignments">
                {member.member_type === "lecturer" ? "Dosen do not hold organizational positions." : null}
              </EmptyState>
            ) : (
              <RowList>
                {assignments.map((a) => (
                  <li key={a.id}>
                    <RowLink href={`/assignments/${a.id}`} className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block font-medium text-pmk-ink">{a.position}</span>
                        <span className="block truncate text-xs text-pmk-muted">{a.unit}</span>
                      </span>
                      <span className="tnum shrink-0 text-right text-sm text-pmk-body">
                        {a.period}
                        {a.activePeriod ? <span className="block text-xs text-pmk-gold-strong">Active</span> : null}
                      </span>
                    </RowLink>
                  </li>
                ))}
              </RowList>
            )}
          </section>

          {!isSelf && !locked ? (
            <section aria-labelledby="account-title" className="rounded-2xl border border-pmk-tint-border p-5">
              <h2 id="account-title" className="text-base font-semibold text-pmk-ink">
                Account
              </h2>
              <p className="mb-4 mt-1 text-sm text-pmk-muted">
                {member.is_active
                  ? "Issue a new temporary password, or deactivate the login. History is kept either way."
                  : "Reactivating restores the login with the existing password."}
              </p>
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
      </div>
    </div>
  );
}
