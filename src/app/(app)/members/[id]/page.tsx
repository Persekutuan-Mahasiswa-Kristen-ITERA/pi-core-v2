import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getMember, listAssignmentsForMember } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ConfirmAction } from "@/components/common/confirm-action";
import { EmptyState, ForbiddenState } from "@/components/common/states";
import {
  Avatar,
  LinkButton,
  PageHeader,
  RowLink,
  RowList,
  SectionHeader,
  Status,
  Tag,
  actionClass,
} from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { AssignmentsIcon, InfoIcon, LockIcon } from "@/components/icons";
import { deactivateMember, reactivateMember, resetMemberPassword, updateMember } from "../actions";
import { MemberForm } from "../member-form";
import { ResetPassword } from "./reset-password";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.members.editTitle };
}

export default async function EditMemberPage({ params }: PageProps<"/members/[id]">) {
  const { allowed, member: actor, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [member, assignments, { d }] = await Promise.all([
    getMember(id.data),
    listAssignmentsForMember(id.data),
    getI18n(),
  ]);
  if (!member) notFound();
  const isSelf = member.id === actor.id;
  // Only a super admin edits a super admin's account (RLS enforces the same).
  const locked = member.access_level === "super_admin" && !isSuperAdmin;
  const typeLabel = member.member_type === "lecturer" ? d.memberType.lecturer : d.memberType.student;

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar name={member.full_name} className="size-12 text-base" />
            <span>{member.full_name}</span>
            {member.access_level === "super_admin" ? <Tag tone="gold">{d.access.super_admin}</Tag> : null}
            {member.access_level === "admin" ? <Tag>{d.access.admin}</Tag> : null}
            {!member.is_active ? <Tag tone="negative">{d.common.deactivated}</Tag> : null}
          </span>
        }
        description={
          <span className="break-all">
            {typeLabel} · {member.email}
            {member.must_change_password && member.is_active ? ` · ${d.members.notChosen}` : ""}
          </span>
        }
        back={{ href: "/members", label: d.nav.members }}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
        <section aria-labelledby="details-title" className="lg:col-span-7">
          <SectionHeader id="details-title" title={d.members.details} />
          {!member.is_active ? (
            <p
              role="status"
              className="mb-4 flex items-start gap-2.5 rounded-2xl border border-pmk-tint-border bg-pmk-tint px-4 py-3 text-sm font-semibold text-pmk-ink"
            >
              <InfoIcon className="mt-px size-5 shrink-0 text-pmk-muted" aria-hidden />
              {d.members.deactivatedNotice}
            </p>
          ) : null}
          {locked ? (
            <FormCard className="flex items-start gap-3 text-sm text-pmk-muted">
              <LockIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div className="space-y-1">
                <p className="font-bold text-pmk-ink">{d.members.superAdminAccount}</p>
                <p>{d.members.superAdminLocked}</p>
              </div>
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
              title={d.members.assignments}
              meta={assignments.length || undefined}
              action={
                member.is_active && member.member_type === "student" ? (
                  <LinkButton href={`/assignments?member=${member.id}`} variant="ghost">
                    {d.members.assignLink}
                  </LinkButton>
                ) : null
              }
            />
            {assignments.length === 0 ? (
              <EmptyState icon={<AssignmentsIcon />} title={d.members.noAssignments}>
                {member.member_type === "lecturer" ? d.members.lecturerNoPositions : null}
              </EmptyState>
            ) : (
              <RowList>
                {assignments.map((a) => (
                  <li key={a.id}>
                    <RowLink href={`/assignments/${a.id}`} className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block font-bold text-pmk-ink">{a.position}</span>
                        <span className="block truncate text-[13px] text-pmk-muted">{a.unit}</span>
                      </span>
                      <span className="tnum flex shrink-0 flex-col items-end gap-1 text-sm text-pmk-body">
                        {a.period}
                        {a.activePeriod ? <Status>{d.common.active}</Status> : null}
                      </span>
                    </RowLink>
                  </li>
                ))}
              </RowList>
            )}
          </section>

          {!isSelf && !locked ? (
            <section
              aria-labelledby="account-title"
              className="rounded-[20px] border border-pmk-tint-border bg-white p-5 shadow-[var(--pmk-shadow-card)]"
            >
              <h2 id="account-title" className="text-[19px] font-bold text-pmk-ink">
                {d.members.account}
              </h2>
              <p className="mb-4 mt-1 text-sm text-pmk-muted">
                {member.is_active ? d.members.accountActive : d.members.accountInactive}
              </p>
              <div className="flex flex-wrap gap-3">
                {member.is_active ? (
                  <>
                    <ResetPassword name={member.full_name} action={resetMemberPassword.bind(null, member.id)} />
                    <ConfirmAction
                      action={deactivateMember.bind(null, member.id)}
                      title={d.members.deactivateTitle(member.full_name)}
                      description={d.members.deactivateBody}
                      confirmLabel={d.members.deactivateConfirm}
                      destructive
                    >
                      <button type="button" className={actionClass("danger-outline")}>
                        {d.members.deactivateMember}
                      </button>
                    </ConfirmAction>
                  </>
                ) : (
                  <ConfirmAction
                    action={reactivateMember.bind(null, member.id)}
                    title={d.members.reactivateTitle(member.full_name)}
                    description={d.members.reactivateBody}
                    confirmLabel={d.members.reactivateConfirm}
                  >
                    <button type="button" className={actionClass("primary")}>
                      {d.members.reactivateMember}
                    </button>
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
