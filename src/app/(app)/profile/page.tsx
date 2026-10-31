import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { listAssignmentsForMember } from "@/lib/queries";
import { signOut } from "@/app/actions/auth";
import { PasswordForm } from "@/components/common/password-form";
import { EmptyState } from "@/components/common/states";
import { RowPill, SectionTitle, TintCard } from "@/components/common/surfaces";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const member = await requireMember();
  const assignments = await listAssignmentsForMember(member.id);

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <TintCard className="space-y-3 p-5">
        <div>
          <p className="text-xl font-bold text-pmk-ink">{member.fullName}</p>
          <p className="break-all text-sm text-pmk-body">{member.email}</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-pmk-body">NIM</dt>
            <dd className="font-medium text-pmk-ink">{member.nim ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-pmk-body">Phone</dt>
            <dd className="font-medium text-pmk-ink">{member.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-pmk-body">PI-CORE access</dt>
            <dd className="font-medium text-pmk-ink">{member.accessLevel === "admin" ? "Admin" : "Member"}</dd>
          </div>
        </dl>
        <p className="text-xs text-pmk-body">To correct your details, contact a PMK ITERA admin.</p>
      </TintCard>

      <section aria-labelledby="my-assignments" className="space-y-3">
        <SectionTitle id="my-assignments">My assignments</SectionTitle>
        {assignments.length === 0 ? (
          <EmptyState title="No assignments yet" />
        ) : (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li key={a.id}>
                <RowPill className="grid grid-cols-3 gap-2 text-sm">
                  <span className="font-medium text-pmk-ink">{a.role}</span>
                  <span>{a.position}</span>
                  <span className="text-right">
                    {a.period}
                    {a.activePeriod ? <span className="block text-xs font-semibold text-pmk-accent">Active</span> : null}
                  </span>
                </RowPill>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="password-title" className="space-y-3">
        <SectionTitle id="password-title">Change password</SectionTitle>
        <PasswordForm />
      </section>

      <form action={signOut}>
        <button
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-pmk-tint-border bg-pmk-tint text-sm font-semibold text-pmk-ink hover:border-pmk-accent/50 focus-visible:outline-2 focus-visible:outline-pmk-accent"
        >
          <LogOut className="size-4" aria-hidden /> Log out
        </button>
      </form>
    </div>
  );
}
