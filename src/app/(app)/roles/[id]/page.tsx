import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CrownIcon, DeleteIcon, EditIcon, MembersIcon, RolesIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getRoleDetail } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ConfirmAction } from "@/components/common/confirm-action";
import { EmptyState, ForbiddenState } from "@/components/common/states";
import {
  Avatar,
  IconBadge,
  LinkButton,
  PageHeader,
  Panel,
  RowList,
  SectionHeader,
  Tag,
  actionClass,
} from "@/components/common/surfaces";
import { deleteRole } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.roles.detailTitle };
}

export default async function RoleDetailPage({ params }: PageProps<"/roles/[id]">) {
  const { allowed, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [detail, { d }] = await Promise.all([getRoleDetail(id.data), getI18n()]);
  if (!detail) notFound();
  const { role, members, positions, activePeriod } = detail;
  const r = d.roles;

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <IconBadge className="size-14 [&_svg]:size-7">
              {role.grants_admin ? <CrownIcon /> : <RolesIcon />}
            </IconBadge>
            <span>{role.name}</span>
            {role.grants_admin ? <Tag tone="gold">{r.adminAccess}</Tag> : null}
          </span>
        }
        description={role.description ?? (role.grants_admin ? r.adminDescription : undefined)}
        back={{ href: "/roles", label: d.nav.roles }}
        actions={
          isSuperAdmin ? (
            <>
              <LinkButton href={`/roles/${role.id}/edit`} variant="secondary">
                <EditIcon aria-hidden />
                {r.edit}
              </LinkButton>
              {role.is_system ? null : (
                <ConfirmAction
                  action={deleteRole.bind(null, role.id!)}
                  title={r.deleteTitle(role.name!)}
                  description={r.deleteBody}
                  confirmLabel={r.delete}
                  destructive
                  redirectTo="/roles"
                >
                  <button type="button" className={actionClass("danger-outline")}>
                    <DeleteIcon aria-hidden />
                    {r.delete}
                  </button>
                </ConfirmAction>
              )}
            </>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
        <section aria-labelledby="role-members" className="lg:col-span-8">
          <SectionHeader
            id="role-members"
            title={r.holdersTitle}
            meta={activePeriod ? r.holdersMeta(role.active_member_count ?? 0, activePeriod.label) : undefined}
          />
          {!activePeriod ? (
            <EmptyState icon={<MembersIcon />} title={r.noPeriodTitle}>
              {r.noPeriodBody}
            </EmptyState>
          ) : members.length === 0 ? (
            <EmptyState icon={<MembersIcon />} title={r.nobodyTitle}>
              {r.nobodyBody}
            </EmptyState>
          ) : (
            <RowList>
              {members.map((m) => (
                <li key={m.assignmentId} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <Avatar name={m.fullName} />
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/members/${m.memberId}`}
                      className="block truncate text-[15px] font-bold text-pmk-ink hover:underline"
                    >
                      {m.fullName}
                    </Link>
                    <span className="block truncate text-[13px] text-pmk-muted">{m.unit}</span>
                  </span>
                  <Tag tone="gold" className="max-w-[45%]">
                    <span className="truncate">{m.position}</span>
                  </Tag>
                </li>
              ))}
            </RowList>
          )}
        </section>

        <section aria-labelledby="role-positions" className="lg:col-span-4">
          <SectionHeader id="role-positions" title={r.positionsWith} />
          <Panel className="text-sm">
            {positions.length === 0 ? (
              <p className="text-pmk-muted">{r.noPositions}</p>
            ) : (
              <ul className="space-y-3">
                {positions.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-pmk-ink">{p.name}</span>
                    <span className="text-[13px] text-pmk-muted">{d.unitType[p.unit_type]}</span>
                  </li>
                ))}
              </ul>
            )}
            {role.is_system ? (
              <p className="mt-4 border-t border-pmk-tint-border pt-3 text-[13px] text-pmk-muted">{r.system}</p>
            ) : null}
          </Panel>
        </section>
      </div>
    </div>
  );
}
