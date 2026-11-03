import type { Metadata } from "next";
import Link from "next/link";
import { AddMemberIcon, AssignmentsIcon, ChevronRightIcon, PeriodsIcon, StructureIcon } from "@/components/icons";
import { isAdminAccess, requireMember, type CurrentMember } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getDashboardStats, getStructureCoverage, listAssignmentsForMember } from "@/lib/queries";
import type { CoverageGroup } from "@/lib/org-structure";
import type { Dict } from "@/lib/i18n/dictionaries";
import {
  Avatar,
  Card,
  Hero,
  IconBadge,
  KeyValueList,
  LinkButton,
  SectionHeader,
  Status,
} from "@/components/common/surfaces";
import { EmptyState } from "@/components/common/states";
import { CountUp } from "@/components/common/count-up";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.home.title };
}

export default async function HomePage() {
  const member = await requireMember();
  const firstName = member.fullName.split(/\s+/)[0];
  return isAdminAccess(member.access) ? (
    <AdminHome firstName={firstName} />
  ) : (
    <MemberHome member={member} firstName={firstName} />
  );
}

function PeriodTag({ label, d }: { label: string | null | undefined; d: Dict }) {
  return (
    <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-pmk-gold-line bg-pmk-gold-soft px-3 text-[13px] font-semibold text-pmk-ink">
      <PeriodsIcon className="size-4" aria-hidden />
      {label ? (
        <>
          {d.nav.activePeriod} <span className="tnum">{label}</span>
        </>
      ) : (
        d.nav.noActivePeriod
      )}
    </span>
  );
}

/*
 * Admin home. Question: "Is this period's kepengurusan complete, and where are the gaps?"
 * Hero with the two most frequent jobs, the four figures, then the leadership seats per BPH /
 * department / bureau beside the quick actions.
 */
async function AdminHome({ firstName }: { firstName: string }) {
  const { d, number } = await getI18n();
  const stats = await getDashboardStats();
  const coverage = stats.activePeriod ? await getStructureCoverage(stats.activePeriod.id) : null;
  const seats = coverage?.groups.reduce((n, g) => n + g.seats.length, 0) ?? 0;
  const filled = coverage?.groups.reduce((n, g) => n + g.filled, 0) ?? 0;

  return (
    <div className="space-y-8">
      <Hero aria-labelledby="hello" className="lg:flex lg:items-center lg:justify-between lg:gap-8">
        <div>
          <PeriodTag label={stats.activePeriod?.label} d={d} />
          <h1
            id="hello"
            className="mt-3 text-[28px] font-extrabold leading-[1.15] tracking-[-0.02em] text-pmk-ink lg:text-[34px]"
          >
            {d.home.greeting(firstName)}
          </h1>
          <p className="tnum mt-1.5 max-w-[56ch] text-[15px] text-pmk-muted">
            {stats.activePeriod ? d.home.seatsLine(stats.activePeriod.label, filled, seats) : d.home.noPeriodLine}
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2.5 lg:mt-0 lg:shrink-0">
          <LinkButton href="/members/new" variant="secondary" className="hidden sm:inline-flex">
            <AddMemberIcon aria-hidden /> {d.home.addMember}
          </LinkButton>
          <LinkButton href="/assignments">
            <AssignmentsIcon aria-hidden /> {d.home.assign}
          </LinkButton>
        </div>
      </Hero>

      <section aria-label={d.home.statistics}>
        <dl className="pmk-stagger grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <Figure
            href="/members"
            label={d.home.totalMembers}
            value={<CountUp value={stats.totalMembers} />}
            note={d.home.lecturersNote(stats.lecturers)}
          />
          <Figure
            href="/periods"
            label={d.home.activePeriod}
            value={stats.activePeriod?.label ?? d.common.none}
            small
          />
          <Figure
            href="/assignments"
            label={d.home.pengurus}
            value={<CountUp value={coverage?.people ?? 0} />}
            note={d.home.positionsNote(coverage?.assignmentCount ?? 0)}
          />
          <Figure href="/roles" label={d.home.availableRoles} value={<CountUp value={stats.availableRoles} />} />
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
        <section aria-labelledby="seats-title" className="lg:col-span-8">
          <SectionHeader
            id="seats-title"
            title={d.home.seats}
            meta={stats.activePeriod?.label}
            action={
              <LinkButton href="/structure" variant="ghost">
                {d.nav.structure}
                <ChevronRightIcon className="pmk-arrow" aria-hidden />
              </LinkButton>
            }
          />
          {!coverage ? (
            <EmptyState title={d.home.noPeriodTitle}>{d.home.noPeriodBody}</EmptyState>
          ) : coverage.groups.length === 0 ? (
            <EmptyState title={d.home.noUnitsTitle}>{d.home.noUnitsBody}</EmptyState>
          ) : (
            <ul className="pmk-rows grid gap-2.5 sm:grid-cols-2">
              {coverage.groups.map((g) => (
                <li key={g.id}>
                  <SeatCard group={g} d={d} format={(n) => number.format(n)} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="shortcuts-title" className="lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
          <SectionHeader id="shortcuts-title" title={d.home.quick} />
          <div className="pmk-stagger grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-2.5">
            <QuickAction
              href="/members/new"
              icon={<AddMemberIcon />}
              title={d.home.qaMember}
              note={d.home.qaMemberNote}
            />
            <QuickAction
              href="/assignments"
              icon={<AssignmentsIcon />}
              title={d.home.qaAssign}
              note={d.home.qaAssignNote}
            />
            <QuickAction
              href="/structure"
              icon={<StructureIcon />}
              title={d.home.qaStructure}
              note={d.home.qaStructureNote}
            />
            <QuickAction href="/periods" icon={<PeriodsIcon />} title={d.home.qaPeriods} note={d.home.qaPeriodsNote} />
          </div>
        </section>
      </div>
    </div>
  );
}

function Figure({
  href,
  label,
  value,
  note,
  small = false,
}: {
  href: string;
  label: string;
  value: React.ReactNode;
  note?: string;
  small?: boolean;
}) {
  // A div with one dt and one dd (value, then note): the E2E suite reads the count from it.
  return (
    <div
      className={cn(
        "pmk-lift relative flex flex-col gap-0.5 rounded-[20px] border border-pmk-tint-border bg-white px-[18px] py-4 shadow-[var(--pmk-shadow-card)] has-focus-visible:outline-2 has-focus-visible:outline-pmk-accent lg:px-6 lg:py-5",
      )}
    >
      <dt className="text-sm font-semibold text-pmk-muted">{label}</dt>
      <dd className="tnum mt-1.5">
        <span
          className={cn(
            "block font-extrabold leading-[1.1] tracking-[-0.03em] text-pmk-ink",
            small ? "text-[28px] lg:text-[32px]" : "text-[40px] lg:text-[44px]",
          )}
        >
          {value}
        </span>
        {note ? <span className="mt-0.5 block text-[13px] text-pmk-muted">{note}</span> : null}
      </dd>
      <Link href={href} className="absolute inset-0 rounded-[20px] outline-none" aria-label={label} />
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  note,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  note: string;
}) {
  return (
    <Link
      href={href}
      className="pmk-lift flex flex-col items-start gap-2.5 rounded-[20px] border border-pmk-tint-border bg-white p-4 shadow-[var(--pmk-shadow-card)] focus-visible:outline-2 focus-visible:outline-pmk-accent lg:flex-row lg:items-center lg:gap-3 lg:px-4 lg:py-3.5"
    >
      <IconBadge className="size-10 rounded-xl">{icon}</IconBadge>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-bold leading-snug text-pmk-ink">{title}</span>
        <span className="text-[13px] leading-snug text-pmk-muted">{note}</span>
      </span>
    </Link>
  );
}

function SeatCard({ group, d, format }: { group: CoverageGroup; d: Dict; format: (n: number) => string }) {
  const total = group.seats.length;
  const open = group.seats.filter((s) => !s.holder);
  const pct = total ? Math.round((group.filled / total) * 100) : 0;
  const openNames = open.map((s) =>
    group.type === "department" && s.unitId !== group.id ? `${s.position} ${s.unitName}` : s.position,
  );
  return (
    <Link
      href="/assignments"
      className="pmk-lift block h-full rounded-[20px] border border-pmk-tint-border bg-white px-[18px] py-4 shadow-[var(--pmk-shadow-card)] focus-visible:outline-2 focus-visible:outline-pmk-accent"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[15px] font-bold text-pmk-ink">{group.name}</span>
        <span className="tnum shrink-0 text-[15px] font-semibold text-pmk-ink">
          {format(group.filled)}
          <span className="font-normal text-pmk-muted"> / {format(total)}</span>
        </span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-pmk-gold-soft" aria-hidden>
        {pct > 0 ? <div className="h-full rounded-full bg-pmk-gold" style={{ width: `${pct}%` }} /> : null}
      </div>
      <p className="mt-2.5 line-clamp-2 text-[13px] text-pmk-muted">
        {total === 0
          ? d.home.noLeadership
          : open.length === 0
            ? d.home.allFilled(group.staff)
            : d.home.open(openNames.slice(0, 3).join(", "), Math.max(0, openNames.length - 3))}
      </p>
    </Link>
  );
}

/*
 * Member home. Question: "What is my place in PMK this period?" Their positions first, then their
 * own details with the way to correct them.
 */
async function MemberHome({ member, firstName }: { member: CurrentMember; firstName: string }) {
  const { d } = await getI18n();
  const assignments = await listAssignmentsForMember(member.id);
  const current = assignments.filter((a) => a.activePeriod);
  const isLecturer = member.memberType === "lecturer";
  const period = current[0]?.period;

  return (
    <div className="space-y-8">
      <Hero aria-labelledby="hello" className="lg:flex lg:items-center lg:justify-between lg:gap-8">
        <span aria-hidden className="pmk-ambient -right-[20%] -top-[60%] aspect-square w-[70%]" />
        <Avatar
          name={member.fullName}
          className="pmk-golden-glow absolute right-5 top-5 z-[1] size-14 text-xl lg:static lg:order-2 lg:size-[72px] lg:text-2xl"
        />
        <div className="pr-16 lg:pr-0">
          <PeriodTag label={period} d={d} />
          <h1
            id="hello"
            className="mt-3 text-[28px] font-extrabold leading-[1.15] tracking-[-0.02em] text-pmk-ink lg:text-[34px]"
          >
            {d.home.greeting(firstName)}
          </h1>
          <p className="mt-1.5 text-[15px] text-pmk-muted">
            {current.length
              ? d.home.memberPositions(current.map((a) => a.position).join(", "), period ?? "")
              : isLecturer
                ? d.home.lecturerLine
                : d.home.memberLine}
          </p>
        </div>
      </Hero>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
        <section aria-labelledby="my-assignments" className="lg:col-span-7">
          <SectionHeader id="my-assignments" title={d.home.yourPosition} meta={period} />
          {current.length === 0 ? (
            <EmptyState icon={<AssignmentsIcon />} title={d.home.noAssignmentTitle}>
              {isLecturer ? d.home.noAssignmentLecturer : d.home.noAssignmentBody}
            </EmptyState>
          ) : (
            <div className="pmk-stagger space-y-3">
              {current.map((a) => (
                <Card key={a.id} className="flex items-center gap-4 border-[#efe3bf] bg-pmk-on-deep p-5">
                  <IconBadge className="size-14 [&_svg]:size-7">
                    <AssignmentsIcon />
                  </IconBadge>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xl font-extrabold leading-tight tracking-[-0.01em] text-pmk-ink">
                      {a.position}
                    </span>
                    <span className="mt-0.5 block text-sm text-pmk-muted">{a.unit}</span>
                  </span>
                  <Status>{d.common.active}</Status>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="my-details" className="lg:col-span-5">
          <SectionHeader
            id="my-details"
            title={d.home.yourDetails}
            action={
              <LinkButton href="/profile" variant="ghost">
                {d.home.profileLink}
                <ChevronRightIcon className="pmk-arrow" aria-hidden />
              </LinkButton>
            }
          />
          <KeyValueList
            items={[
              { label: d.home.email, value: <span className="break-all">{member.email}</span> },
              {
                label: isLecturer ? "NIP / NIDN" : "NIM",
                value: <span className="tnum">{(isLecturer ? member.nip : member.nim) ?? "—"}</span>,
              },
              { label: d.home.phone, value: <span className="tnum">{member.phone ?? "—"}</span> },
              { label: d.profile.access, value: d.access[member.access] },
            ]}
          />
        </section>
      </div>
    </div>
  );
}
