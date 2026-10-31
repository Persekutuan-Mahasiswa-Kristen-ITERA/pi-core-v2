import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck2, Settings, ShieldHalf, UserRoundCheck, UserRoundSearch, UsersRound, type LucideIcon } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { getDashboardStats, listAssignmentsForMember } from "@/lib/queries";
import { SectionTitle, TintCard, RowPill } from "@/components/common/surfaces";
import { EmptyState } from "@/components/common/states";

export const metadata: Metadata = { title: "Dashboard" };

const numberFormat = new Intl.NumberFormat("en-US");

export default async function DashboardPage() {
  const member = await requireMember();
  const firstName = member.fullName.split(/\s+/)[0];
  const isAdmin = member.accessLevel === "admin";

  return (
    <div className="space-y-6">
      <section
        aria-label="Greeting"
        className="mt-4 flex min-h-[82px] items-center rounded-[40px] bg-pmk-brown px-6 py-5 text-white shadow-[inset_45px_7px_20px_-7px_rgba(0,0,0,0.25)]"
      >
        <p className="text-2xl font-bold">Shalom {firstName}!</p>
      </section>
      {isAdmin ? <AdminDashboard /> : <MemberDashboard memberId={member.id} />}
    </div>
  );
}

async function AdminDashboard() {
  const stats = await getDashboardStats();
  return (
    <>
      {/* Percentage deltas from the prototype are omitted: no stored history to compute them from. */}
      <section aria-label="Statistics" className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={UsersRound} label="Total Members" value={numberFormat.format(stats.totalMembers)} />
        <StatCard icon={CalendarCheck2} label="Active Period" value={stats.activePeriod?.label ?? "None set"} />
        <StatCard icon={ShieldHalf} label="Available Roles" value={numberFormat.format(stats.availableRoles)} className="col-span-2 lg:col-span-1" />
      </section>
      <section aria-labelledby="quick-access" className="space-y-4">
        <SectionTitle id="quick-access">Quick Access</SectionTitle>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <QuickLink href="/members" icon={UserRoundSearch} label="Members" />
          <QuickLink href="/roles" icon={ShieldHalf} label="Roles" />
          <QuickLink href="/settings" icon={Settings} label="Settings" />
        </div>
      </section>
    </>
  );
}

async function MemberDashboard({ memberId }: { memberId: string }) {
  const assignments = await listAssignmentsForMember(memberId);
  const current = assignments.filter((a) => a.activePeriod);
  const activeLabel = current[0]?.period;
  return (
    <section aria-labelledby="my-assignments" className="space-y-3">
      <SectionTitle id="my-assignments">Your assignments{activeLabel ? ` · ${activeLabel}` : ""}</SectionTitle>
      {current.length === 0 ? (
        <EmptyState title="No assignment in the active period">
          When an admin assigns you a role, it will appear here. Past assignments are under Profile.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {current.map((a) => (
            <li key={a.id}>
              <RowPill className="flex items-center justify-between gap-3">
                <span className="font-semibold text-pmk-ink">{a.role}</span>
                <span className="text-right text-sm">{a.position}</span>
              </RowPill>
            </li>
          ))}
        </ul>
      )}
      <QuickLink href="/profile" icon={UserRoundCheck} label="My profile" />
    </section>
  );
}

function StatCard({ icon: Icon, label, value, className }: { icon: LucideIcon; label: string; value: string; className?: string }) {
  return (
    <TintCard className={`flex min-h-[134px] flex-col gap-1 p-5 ${className ?? ""}`}>
      <Icon className="mb-2 size-5 text-pmk-accent" aria-hidden />
      <p className="text-sm text-pmk-body">{label}</p>
      <p className="text-2xl font-bold text-pmk-ink">{value}</p>
    </TintCard>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[106px] flex-col items-center justify-center gap-3 rounded-xl border border-pmk-tint-border/60 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:border-pmk-accent/40 focus-visible:outline-2 focus-visible:outline-pmk-accent"
    >
      <span className="grid size-11 place-items-center rounded-full bg-pmk-tint text-pmk-accent">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="text-sm font-bold text-pmk-ink">{label}</span>
    </Link>
  );
}
