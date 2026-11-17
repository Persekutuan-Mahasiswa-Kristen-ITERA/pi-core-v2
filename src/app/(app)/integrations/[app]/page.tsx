import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeactivateIcon, DeleteIcon, IntegrationsIcon, MembersIcon, ReactivateIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getAppAccess, listOrgUnits, listPositions, listRolesForPicker } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { ConfirmAction } from "@/components/common/confirm-action";
import { FormCard, InfoBanner } from "@/components/common/form-controls";
import { EmptyState, ForbiddenState } from "@/components/common/states";
import {
  Avatar,
  IconBadge,
  PageHeader,
  Panel,
  RowList,
  SectionHeader,
  Tag,
  actionClass,
} from "@/components/common/surfaces";
import { createAccessRule, deleteAccessRule, setAccessRuleEnabled } from "../actions";
import { RuleForm } from "./rule-form";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.integrations.title };
}

/** Every active member, dosen included (a member rule may name a pembina). */
async function listActiveMembers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, full_name, email")
    .eq("is_active", true)
    .order("full_name");
  if (error) throw new Error(`members: ${error.message}`);
  return data;
}

export default async function AppAccessPage({ params }: PageProps<"/integrations/[app]">) {
  const { allowed, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const appKey = (await params).app;
  if (!/^[a-z][a-z0-9_]{1,30}$/.test(appKey)) notFound();
  const [access, { d }] = await Promise.all([getAppAccess(appKey), getI18n()]);
  if (!access) notFound();
  const t = d.integrations;
  const { app, roles, rules, holders, pending } = access;
  const roleName = (key: string) => roles.find((r) => r.key === key)?.name ?? key;

  const options = isSuperAdmin
    ? await Promise.all([listActiveMembers(), listRolesForPicker(), listPositions(), listOrgUnits()]).then(
        ([members, pmkRoles, positions, units]) => ({
          member: members.map((m) => ({ id: m.id, label: `${m.full_name} · ${m.email}` })),
          role: pmkRoles.map((r) => ({ id: r.id, label: r.name })),
          position: positions.map((p) => ({ id: p.id, label: `${p.name} · ${d.unitType[p.unitType]}` })),
          org_unit: units
            .filter((u) => u.type !== "organization")
            .map((u) => ({ id: u.id, label: `${"  ".repeat(Math.max(u.depth - 1, 0))}${u.name}` })),
        }),
      )
    : null;

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <IconBadge className="size-14 [&_svg]:size-7">
              <IntegrationsIcon />
            </IconBadge>
            <span>{app.name}</span>
          </span>
        }
        description={app.description ?? undefined}
        back={{ href: "/integrations", label: d.nav.integrations }}
        actions={
          app.url ? (
            <a href={app.url} target="_blank" rel="noopener noreferrer" className={actionClass("secondary")}>
              {t.openApp}
            </a>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-8 lg:col-span-7">
          {roles.map((role) => {
            const roleRules = rules.filter((r) => r.appRoleKey === role.key);
            return (
              <section key={role.key} aria-labelledby={`role-${role.key}`}>
                <SectionHeader id={`role-${role.key}`} title={role.name} />
                {role.description ? <p className="-mt-1 mb-3 px-1 text-[13px] text-pmk-muted">{role.description}</p> : null}
                {roleRules.length === 0 ? (
                  <Panel className="text-sm text-pmk-muted">{t.noRules}</Panel>
                ) : (
                  <RowList>
                    {roleRules.map((rule) => (
                      <li key={rule.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <Tag tone="gold">{rule.subject ? t.subjectType[rule.subject.type] : "?"}</Tag>
                            <span className={rule.isEnabled ? "font-bold text-pmk-ink" : "font-bold text-pmk-muted line-through"}>
                              {rule.subject?.label ?? t.missingSubject}
                            </span>
                            {rule.subject?.type === "position" ? (
                              <span className="text-[13px] text-pmk-muted">
                                {d.unitType[rule.subject.unitType as keyof typeof d.unitType] ?? ""}
                              </span>
                            ) : null}
                            {rule.subject?.type === "org_unit" && rule.subject.includeChildUnits ? (
                              <span className="text-[13px] text-pmk-muted">{t.withChildUnits}</span>
                            ) : null}
                            {rule.isEnabled ? null : <Tag tone="negative">{t.disabled}</Tag>}
                          </span>
                          {rule.note ? <span className="mt-0.5 block text-[13px] text-pmk-muted">{rule.note}</span> : null}
                        </span>
                        {isSuperAdmin ? (
                          <span className="flex gap-2">
                            <ConfirmAction
                              action={setAccessRuleEnabled.bind(null, rule.id, !rule.isEnabled)}
                              title={rule.isEnabled ? t.disableTitle : t.enableTitle}
                              description={rule.isEnabled ? t.disableBody : t.enableBody}
                              confirmLabel={rule.isEnabled ? t.disable : t.enable}
                            >
                              <button type="button" className={actionClass("secondary", "h-9 px-3 text-[13px]")}>
                                {rule.isEnabled ? <DeactivateIcon aria-hidden /> : <ReactivateIcon aria-hidden />}
                                {rule.isEnabled ? t.disable : t.enable}
                              </button>
                            </ConfirmAction>
                            <ConfirmAction
                              action={deleteAccessRule.bind(null, rule.id)}
                              title={t.deleteTitle}
                              description={t.deleteBody}
                              confirmLabel={t.delete}
                              destructive
                            >
                              <button
                                type="button"
                                aria-label={t.delete}
                                className={actionClass("danger-outline", "h-9 px-3 text-[13px]")}
                              >
                                <DeleteIcon aria-hidden />
                              </button>
                            </ConfirmAction>
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </RowList>
                )}
              </section>
            );
          })}

          {isSuperAdmin && options ? (
            <section aria-labelledby="add-rule">
              <SectionHeader id="add-rule" title={t.addTitle} />
              <FormCard>
                <RuleForm
                  action={createAccessRule.bind(null, app.key)}
                  appRoles={roles.map((r) => ({ key: r.key, name: r.name }))}
                  options={options}
                />
              </FormCard>
            </section>
          ) : (
            <InfoBanner>{t.readOnly}</InfoBanner>
          )}
        </div>

        <section aria-labelledby="holders" className="lg:col-span-5">
          <SectionHeader id="holders" title={t.holdersTitle} meta={t.holdersMeta(new Set(holders.map((h) => h.memberId)).size)} />
          {holders.length === 0 ? (
            <EmptyState icon={<MembersIcon />} title={t.noHolders}>
              {t.periodNote}
            </EmptyState>
          ) : (
            <>
              <RowList>
                {holders.map((h) => (
                  <li key={`${h.memberId}:${h.appRoleKey}`} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <Avatar name={h.fullName} />
                    <span className="min-w-0 flex-1">
                      <Link href={`/members/${h.memberId}`} className="block truncate text-[15px] font-bold text-pmk-ink hover:underline">
                        {h.fullName}
                      </Link>
                      <span className="block truncate text-[13px] text-pmk-muted">{h.email}</span>
                    </span>
                    <Tag tone="gold" className="max-w-[45%]">
                      <span className="truncate">{roleName(h.appRoleKey)}</span>
                    </Tag>
                  </li>
                ))}
              </RowList>
              <p className="mt-2.5 px-1 text-[13px] text-pmk-muted">{t.periodNote}</p>
            </>
          )}

          {pending.length > 0 ? (
            <div className="mt-8">
              <SectionHeader id="pending" title={t.pendingTitle} meta={t.pendingMeta(pending.length)} />
              <p className="-mt-1 mb-3 px-1 text-[13px] text-pmk-muted">{t.pendingBody}</p>
              <RowList>
                {pending.map((p) => (
                  <li key={p.memberId} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <Avatar name={p.fullName} />
                    <span className="min-w-0 flex-1">
                      <Link href={`/members/${p.memberId}`} className="block truncate text-[15px] font-bold text-pmk-ink hover:underline">
                        {p.fullName}
                      </Link>
                      <span className="block truncate text-[13px] text-pmk-muted">
                        {p.neverSignedIn ? t.neverSignedIn : t.temporaryPassword}
                      </span>
                    </span>
                    <span className="flex max-w-[45%] flex-wrap justify-end gap-1">
                      {p.appRoleKeys.map((k) => (
                        <Tag key={k}>
                          <span className="truncate">{roleName(k)}</span>
                        </Tag>
                      ))}
                    </span>
                  </li>
                ))}
              </RowList>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
