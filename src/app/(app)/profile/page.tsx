import type { Metadata } from "next";
import Link from "next/link";
import { AssignmentsIcon, ChevronRightIcon, SettingsIcon } from "@/components/icons";
import { isAdminAccess, requireMember } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { listAssignmentsForMember } from "@/lib/queries";
import { PasswordForm } from "@/components/common/password-form";
import { EmptyState } from "@/components/common/states";
import { LanguageSwitch } from "@/components/common/language-switch";
import {
  Avatar,
  Card,
  Hero,
  IconBadge,
  KeyValueList,
  RowList,
  SectionHeader,
  Status,
  Tag,
} from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { LogoutButton } from "@/components/shell/logout-button";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.profile.title };
}

export default async function ProfilePage() {
  const member = await requireMember();
  const [assignments, { d }] = await Promise.all([listAssignmentsForMember(member.id), getI18n()]);
  const isLecturer = member.memberType === "lecturer";
  const isAdmin = isAdminAccess(member.access);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
      <div className="space-y-8 lg:col-span-5">
        <Hero className="flex flex-col items-center gap-1.5 px-5 py-8 text-center lg:p-8">
          <span aria-hidden className="pmk-aura -right-12 -top-16" />
          <span aria-hidden className="pmk-aura pmk-aura-2 -bottom-24 -left-14" />
          <Avatar
            name={member.fullName}
            size="lg"
            className="pmk-avatar-halo mb-2 shadow-[0_0_0_5px_var(--pmk-on-deep)]"
          />
          <h1 className="text-2xl font-extrabold tracking-[-0.01em] text-pmk-ink">{member.fullName}</h1>
          <p className="break-all text-sm text-pmk-muted">{member.email}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            <Tag tone="gold">{d.access[member.access]}</Tag>
            <Tag>{isLecturer ? d.memberType.lecturer : d.memberType.student}</Tag>
          </div>
        </Hero>

        <section aria-labelledby="details-title">
          <SectionHeader id="details-title" title={d.profile.yourDetails} />
          <KeyValueList
            items={[
              {
                label: isLecturer ? "NIP / NIDN" : "NIM",
                value: <span className="tnum">{(isLecturer ? member.nip : member.nim) ?? "—"}</span>,
              },
              { label: d.home.phone, value: <span className="tnum">{member.phone ?? "—"}</span> },
              { label: d.profile.access, value: d.access[member.access] },
              { label: "Status", value: <Status breathe>{d.common.active}</Status> },
            ]}
          />
          <p className="mt-2.5 px-1 text-[13px] text-pmk-muted">{d.profile.correct}</p>
        </section>
      </div>

      <div className="space-y-8 lg:col-span-7">
        <section aria-labelledby="my-assignments">
          <SectionHeader id="my-assignments" title={d.profile.myAssignments} meta={assignments.length || undefined} />
          {assignments.length === 0 ? (
            <EmptyState icon={<AssignmentsIcon />} title={d.profile.noAssignments}>
              {isLecturer ? d.members.lecturerNoPositions : null}
            </EmptyState>
          ) : (
            <RowList>
              {assignments.map((a) => (
                <li key={a.id} className="flex items-center gap-3.5 px-4 py-3.5 text-sm">
                  <IconBadge className="size-10 rounded-xl [&_svg]:size-5">
                    <AssignmentsIcon />
                  </IconBadge>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold text-pmk-ink">{a.position}</span>
                    <span className="block truncate text-[13px] text-pmk-muted">
                      {a.unit} · <span className="tnum">{a.period}</span>
                    </span>
                  </span>
                  {a.activePeriod ? (
                    <Status>{d.common.active}</Status>
                  ) : (
                    <Status active={false}>{d.profile.finished}</Status>
                  )}
                </li>
              ))}
            </RowList>
          )}
        </section>

        <section aria-labelledby="account-title" className="space-y-3">
          <SectionHeader id="account-title" title={d.profile.account} className="mb-0" />
          <Card className="p-2">
            <ul className="divide-y divide-pmk-rule">
              {isAdmin ? (
                <li>
                  <Link
                    href="/settings"
                    className="pmk-lift flex min-h-[60px] items-center gap-3.5 rounded-2xl border border-transparent px-2.5 py-2.5 text-[15px] font-semibold text-pmk-ink hover:bg-pmk-tint hover:shadow-none focus-visible:outline-2 focus-visible:outline-pmk-accent"
                  >
                    <IconBadge className="size-10 rounded-xl bg-pmk-tint [&_svg]:size-5">
                      <SettingsIcon />
                    </IconBadge>
                    <span className="flex min-w-0 flex-1 flex-col">
                      {d.nav.settings}
                      <span className="text-[13px] font-normal text-pmk-muted">{d.profile.settingsNote}</span>
                    </span>
                    <ChevronRightIcon className="size-5 text-pmk-muted" aria-hidden />
                  </Link>
                </li>
              ) : null}
              <li className="px-2.5 py-3.5">
                <LanguageSwitch />
              </li>
              <li className="pt-1">
                <LogoutButton variant="menu" />
              </li>
            </ul>
          </Card>
        </section>

        <section aria-labelledby="password-title">
          <SectionHeader id="password-title" title={d.profile.changePassword} />
          <FormCard>
            <PasswordForm />
          </FormCard>
        </section>
      </div>
    </div>
  );
}
