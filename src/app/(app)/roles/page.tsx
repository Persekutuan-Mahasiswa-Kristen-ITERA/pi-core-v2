import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon, CrownIcon, PlusIcon, RolesIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getActivePeriod, listRoleOverview } from "@/lib/queries";
import { IconBadge, LinkButton, PageHeader, Tag } from "@/components/common/surfaces";
import { EmptyState, ForbiddenState } from "@/components/common/states";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.roles.title };
}

export default async function RolesPage() {
  const { allowed, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const [roles, activePeriod, { d }] = await Promise.all([listRoleOverview(), getActivePeriod(), getI18n()]);
  const r = d.roles;

  return (
    <>
      <PageHeader
        title={r.title}
        description={r.description(activePeriod?.label ?? null)}
        actions={
          isSuperAdmin ? (
            <LinkButton href="/roles/new">
              <PlusIcon aria-hidden /> {r.create}
            </LinkButton>
          ) : null
        }
      />
      {roles.length === 0 ? (
        <EmptyState icon={<RolesIcon />} title={r.emptyTitle}>
          {r.emptyBody}
        </EmptyState>
      ) : (
        <ul className="pmk-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {roles.map((role) => (
            <li key={role.id}>
              <Link
                href={`/roles/${role.id}`}
                className="pmk-lift flex h-full flex-col gap-1.5 rounded-[20px] border border-pmk-tint-border bg-white p-[18px] shadow-[var(--pmk-shadow-card)] focus-visible:outline-2 focus-visible:outline-pmk-accent"
              >
                <span className="mb-1.5 flex items-start justify-between gap-2">
                  <IconBadge>{role.grants_admin ? <CrownIcon /> : <RolesIcon />}</IconBadge>
                  {role.grants_admin ? <Tag tone="gold">{r.adminAccess}</Tag> : null}
                </span>
                <span className="text-lg font-extrabold leading-snug text-pmk-ink">{role.name}</span>
                {role.description ? (
                  <span className="line-clamp-2 text-sm text-pmk-muted">{role.description}</span>
                ) : null}
                <span className="mt-auto flex items-center justify-between gap-2 border-t border-pmk-rule pt-3 text-[13px] font-semibold text-pmk-ink">
                  <span className="tnum">
                    {r.holders(role.active_member_count ?? 0)}
                    <span className="font-normal text-pmk-muted"> · {r.positions(role.position_count ?? 0)}</span>
                  </span>
                  <ChevronRightIcon className="size-[18px] text-pmk-muted" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
          {isSuperAdmin ? (
            <li>
              <Link
                href="/roles/new"
                className="pmk-press flex h-full min-h-[132px] items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-dashed border-[#dccb9e] text-[15px] font-semibold text-pmk-ink hover:bg-pmk-tint focus-visible:outline-2 focus-visible:outline-pmk-accent"
              >
                <PlusIcon className="size-5" aria-hidden /> {r.create}
              </Link>
            </li>
          ) : null}
        </ul>
      )}
    </>
  );
}
