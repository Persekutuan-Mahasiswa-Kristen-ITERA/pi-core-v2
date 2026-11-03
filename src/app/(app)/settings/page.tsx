import type { Metadata } from "next";
import Image from "next/image";
import { IntegrationsIcon, KeyIcon, LockIcon, ProfileIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getOrgSettings } from "@/lib/queries";
import { AUTH_METHODS } from "@/lib/app-config";
import { ForbiddenState } from "@/components/common/states";
import { Card, IconBadge, PageHeader, SectionHeader, Tag } from "@/components/common/surfaces";
import { OrgForm } from "./org-form";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.settings.title };
}

export default async function SettingsPage() {
  const { allowed, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const [settings, { d }] = await Promise.all([getOrgSettings(), getI18n()]);
  const t = d.settings;

  return (
    <div className="max-w-5xl">
      <PageHeader title={t.title} description={t.description} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
        <section aria-labelledby="org-title" className="lg:row-span-2">
          <SectionHeader id="org-title" title={t.org} />
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-4">
              <Image src="/brand/pmk-logo-192.png" alt={t.logoAlt} width={60} height={60} className="shrink-0" />
              <p className="text-sm text-pmk-muted">{isSuperAdmin ? t.orgSuper : t.orgOther}</p>
            </div>
            {isSuperAdmin ? (
              <OrgForm orgName={settings?.org_name ?? ""} />
            ) : (
              <p className="text-[17px] font-bold text-pmk-ink">{settings?.org_name}</p>
            )}
          </Card>
        </section>

        <section aria-labelledby="auth-config">
          <SectionHeader id="auth-config" title={t.auth} />
          <Card className="px-4">
            <ul className="divide-y divide-pmk-rule">
              {AUTH_METHODS.map((m) => (
                <li key={m.id} className="flex min-h-[68px] items-center gap-3 py-3">
                  <IconBadge className="size-10 rounded-xl bg-pmk-tint [&_svg]:size-5">
                    {m.id === "email_password" ? <KeyIcon /> : <ProfileIcon />}
                  </IconBadge>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-pmk-ink">{t.methods[m.id].label}</p>
                    <p className="text-[13px] text-pmk-muted">{t.methods[m.id].note}</p>
                  </div>
                  {m.enabled ? (
                    <span className="flex items-center gap-2">
                      {/* Locked on: the main method cannot be switched off. */}
                      <span
                        role="switch"
                        aria-checked="true"
                        aria-disabled="true"
                        aria-label={`${t.methods[m.id].label}: ${t.enabled}`}
                        className="relative h-7 w-12 rounded-full bg-pmk-positive after:absolute after:right-[3px] after:top-[3px] after:size-[22px] after:rounded-full after:bg-white"
                      />
                      <LockIcon className="size-4 text-pmk-muted" aria-hidden />
                    </span>
                  ) : (
                    <Tag>{t.notYet}</Tag>
                  )}
                </li>
              ))}
            </ul>
          </Card>
          <p className="mt-2.5 px-1 text-[13px] text-pmk-muted">{t.authBody}</p>
        </section>

        <section aria-labelledby="other-title">
          <SectionHeader id="other-title" title={t.integrations} />
          <Card className="flex min-h-[68px] items-center gap-3 px-4 py-3">
            <IconBadge className="size-10 rounded-xl bg-pmk-tint [&_svg]:size-5">
              <IntegrationsIcon />
            </IconBadge>
            <p className="min-w-0 flex-1 text-[13px] text-pmk-muted">{t.integrationsNote}</p>
            <Tag>{d.common.soon}</Tag>
          </Card>
        </section>
      </div>
      <p className="mt-10 text-center text-[13px] text-pmk-muted">
        {d.nav.version} <span className="tnum">0.1.0</span>
      </p>
    </div>
  );
}
