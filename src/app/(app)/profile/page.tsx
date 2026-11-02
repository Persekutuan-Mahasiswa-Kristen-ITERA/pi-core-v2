import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { listAssignmentsForMember } from "@/lib/queries";
import { PasswordForm } from "@/components/common/password-form";
import { EmptyState } from "@/components/common/states";
import { DefinitionGrid, PageHeader, Panel, RowList, SectionHeader, Tag } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { LogoutButton } from "@/components/shell/logout-button";

export const metadata: Metadata = { title: "Profile" };

const ACCESS_LABEL = { super_admin: "Super admin", admin: "Admin", member: "Member" } as const;

export default async function ProfilePage() {
  const member = await requireMember();
  const assignments = await listAssignmentsForMember(member.id);
  const isLecturer = member.memberType === "lecturer";

  return (
    <div>
      <PageHeader title={member.fullName} description={<span className="break-all">{member.email}</span>} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-8 lg:col-span-7">
          <section aria-labelledby="details-title">
            <SectionHeader id="details-title" title="Your details" />
            <Panel>
              <DefinitionGrid
                items={[
                  { label: isLecturer ? "NIP / NIDN" : "NIM", value: (isLecturer ? member.nip : member.nim) ?? "—" },
                  { label: "Phone", value: member.phone ?? "—" },
                  { label: "PI-CORE access", value: ACCESS_LABEL[member.access] },
                ]}
              />
              <p className="mt-5 text-xs text-pmk-muted">To correct your details, contact a PMK ITERA admin.</p>
            </Panel>
          </section>

          <section aria-labelledby="my-assignments">
            <SectionHeader id="my-assignments" title="My assignments" meta={assignments.length || undefined} />
            {assignments.length === 0 ? (
              <EmptyState title="No assignments yet">
                {isLecturer ? "Dosen do not hold organizational positions." : null}
              </EmptyState>
            ) : (
              <RowList>
                {assignments.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="block font-medium text-pmk-ink">{a.position}</span>
                      <span className="block truncate text-xs text-pmk-muted">{a.unit}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {a.activePeriod ? <Tag tone="gold">Active</Tag> : null}
                      <span className="tnum text-pmk-body">{a.period}</span>
                    </span>
                  </li>
                ))}
              </RowList>
            )}
          </section>
        </div>

        <div className="space-y-8 lg:col-span-5">
          <section aria-labelledby="password-title">
            <SectionHeader id="password-title" title="Change password" />
            <FormCard>
              <PasswordForm />
            </FormCard>
          </section>
          <LogoutButton variant="block" />
        </div>
      </div>
    </div>
  );
}
