import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { isAdminAccess, requireMember, type CurrentMember } from "@/lib/auth";
import { getDashboardStats, getStructureCoverage, listAssignmentsForMember } from "@/lib/queries";
import type { CoverageGroup } from "@/lib/org-structure";
import { Card, DefinitionGrid, LinkButton, Panel, RowList, SectionHeader } from "@/components/common/surfaces";
import { EmptyState } from "@/components/common/states";

export const metadata: Metadata = { title: "Home" };

const fmt = new Intl.NumberFormat("id-ID");

export default async function HomePage() {
  const member = await requireMember();
  const firstName = member.fullName.split(/\s+/)[0];
  return isAdminAccess(member.access) ? (
    <AdminHome firstName={firstName} />
  ) : (
    <MemberHome member={member} firstName={firstName} />
  );
}

/*
 * Admin home. Question: "Is this period's kepengurusan complete, and where are the gaps?"
 * Largest block: leadership seats per BPH / department / bureau. Most frequent job: assign a
 * position, one click from the title row.
 */
async function AdminHome({ firstName }: { firstName: string }) {
  const stats = await getDashboardStats();
  const coverage = stats.activePeriod ? await getStructureCoverage(stats.activePeriod.id) : null;
  const seats = coverage?.groups.reduce((n, g) => n + g.seats.length, 0) ?? 0;
  const filled = coverage?.groups.reduce((n, g) => n + g.filled, 0) ?? 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.015em] text-pmk-ink lg:text-[28px]">
            Shalom {firstName}!
          </h1>
          <p className="tnum mt-1.5 text-sm text-pmk-muted">
            {stats.activePeriod
              ? `Kepengurusan ${stats.activePeriod.label} · ${filled} of ${seats} leadership seats filled`
              : "No active period yet. Set one under Periods to start assigning positions."}
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/assignments">
            <Plus aria-hidden /> Assign a position
          </LinkButton>
          <LinkButton href="/members/new" variant="secondary" className="hidden sm:inline-flex">
            Add member
          </LinkButton>
        </div>
      </header>

      <section aria-label="Statistics">
        <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-pmk-tint-border sm:grid-cols-4">
          <Figure label="Total Members" value={fmt.format(stats.totalMembers)} note={`${stats.lecturers} dosen`} />
          <Figure label="Active Period" value={stats.activePeriod?.label ?? "None"} />
          <Figure
            label="Pengurus this period"
            value={fmt.format(coverage?.people ?? 0)}
            note={`${coverage?.assignmentCount ?? 0} positions`}
          />
          <Figure label="Available Roles" value={fmt.format(stats.availableRoles)} />
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
        <section aria-labelledby="seats-title" className="lg:col-span-8">
          <SectionHeader
            id="seats-title"
            title="Leadership seats"
            meta={stats.activePeriod?.label}
            action={
              <LinkButton href="/structure" variant="ghost">
                Structure
              </LinkButton>
            }
          />
          {!coverage ? (
            <EmptyState title="No active period">
              Leadership seats are counted for the active period. Create or activate one under Periods.
            </EmptyState>
          ) : coverage.groups.length === 0 ? (
            <EmptyState title="No units yet">Add BPH, departments and bureaus under Structure.</EmptyState>
          ) : (
            <RowList>
              {coverage.groups.map((g) => (
                <li key={g.id}>
                  <SeatRow group={g} />
                </li>
              ))}
            </RowList>
          )}
        </section>

        <section aria-labelledby="shortcuts-title" className="lg:sticky lg:top-6 lg:col-span-4 lg:self-start">
          <SectionHeader id="shortcuts-title" title="Manage" />
          <RowList>
            {[
              { href: "/members", label: "Members", note: `${fmt.format(stats.totalMembers)} active` },
              { href: "/assignments", label: "Assignments", note: stats.activePeriod?.label ?? "No period" },
              { href: "/roles", label: "Roles", note: `${stats.availableRoles} roles` },
              { href: "/periods", label: "Periods", note: "Academic years" },
              { href: "/settings", label: "Settings", note: "Organization" },
            ].map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="flex min-h-12 items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-pmk-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pmk-accent"
                >
                  <span className="font-medium text-pmk-ink">{s.label}</span>
                  <span className="tnum ml-auto text-pmk-muted">{s.note}</span>
                  <ChevronRight className="size-4 text-pmk-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </RowList>
        </section>
      </div>
    </div>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-pmk-tint-border px-4 py-4 odd:border-r [&:nth-child(-n+2)]:border-b sm:border-r sm:[&:nth-child(-n+2)]:border-b-0 sm:last:border-r-0 lg:px-5">
      <dt className="text-xs text-pmk-muted sm:text-sm">{label}</dt>
      <dd className="tnum mt-1 text-xl font-medium text-pmk-ink lg:text-2xl">
        {value}
        {note ? (
          <>
            {" "}
            <span className="ml-1 text-xs font-normal text-pmk-muted sm:text-sm">{note}</span>
          </>
        ) : null}
      </dd>
    </div>
  );
}

function SeatRow({ group }: { group: CoverageGroup }) {
  const total = group.seats.length;
  const open = group.seats.filter((s) => !s.holder);
  const pct = total ? Math.round((group.filled / total) * 100) : 0;
  const openNames = open.map((s) =>
    group.type === "department" && s.unitId !== group.id ? `${s.position} ${s.unitName}` : s.position,
  );
  return (
    <Link
      href="/assignments"
      className="block px-4 py-3.5 transition-colors hover:bg-pmk-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pmk-accent"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-medium text-pmk-ink">{group.name}</span>
        <span className="tnum shrink-0 text-sm text-pmk-ink">
          {group.filled}
          <span className="text-pmk-muted"> / {total}</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-pmk-gold-soft" aria-hidden>
        {pct > 0 ? <div className="h-full rounded-full bg-pmk-gold" style={{ width: `${pct}%` }} /> : null}
      </div>
      <p className="mt-2 truncate text-xs text-pmk-muted">
        {total === 0
          ? "No leadership positions defined for this unit."
          : open.length === 0
            ? `All seats filled${group.staff ? ` · ${group.staff} staff` : ""}`
            : `Open: ${openNames.slice(0, 3).join(", ")}${openNames.length > 3 ? ` +${openNames.length - 3} more` : ""}`}
      </p>
    </Link>
  );
}

/*
 * Member home. Question: "What is my place in PMK this period?" Their positions first, then their
 * own details with the way to correct them.
 */
async function MemberHome({ member, firstName }: { member: CurrentMember; firstName: string }) {
  const assignments = await listAssignmentsForMember(member.id);
  const current = assignments.filter((a) => a.activePeriod);
  const isLecturer = member.memberType === "lecturer";
  const period = current[0]?.period;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.015em] text-pmk-ink lg:text-[28px]">
          Shalom {firstName}!
        </h1>
        <p className="mt-1.5 text-sm text-pmk-muted">
          {current.length
            ? `${current.map((a) => a.position).join(", ")} · ${period}`
            : isLecturer
              ? "Pembina / dosen of PMK ITERA"
              : "Member of PMK ITERA"}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
        <section aria-labelledby="my-assignments" className="lg:col-span-7">
          <SectionHeader id="my-assignments" title="Your position" meta={period} />
          {current.length === 0 ? (
            <EmptyState title="No assignment in the active period">
              {isLecturer
                ? "Dosen do not hold organizational positions in PI-CORE."
                : "When an admin assigns you a position, it appears here. Past assignments are under Profile."}
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {current.map((a) => (
                <Card key={a.id} className="p-5">
                  <p className="text-lg font-semibold text-pmk-ink">{a.position}</p>
                  <p className="mt-1 text-sm text-pmk-muted">{a.unit}</p>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="my-details" className="lg:col-span-5">
          <SectionHeader
            id="my-details"
            title="Your details"
            action={
              <LinkButton href="/profile" variant="ghost">
                Profile
              </LinkButton>
            }
          />
          <Panel>
            <DefinitionGrid
              className="sm:grid-cols-2"
              items={[
                { label: isLecturer ? "NIP / NIDN" : "NIM", value: (isLecturer ? member.nip : member.nim) ?? "—" },
                { label: "Phone", value: member.phone ?? "—" },
                { label: "Email", value: member.email },
              ]}
            />
          </Panel>
        </section>
      </div>
    </div>
  );
}
