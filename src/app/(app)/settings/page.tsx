import type { Metadata } from "next";
import Image from "next/image";
import { requireAdminPage } from "@/lib/auth";
import { getOrgSettings } from "@/lib/queries";
import { AUTH_METHODS } from "@/lib/app-config";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader, Tag } from "@/components/common/surfaces";
import { OrgForm } from "./org-form";

export const metadata: Metadata = { title: "Settings" };

/** One settings row: what it is on the left, the panel on the right (stacked on phones). */
function SettingsRow({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-4 border-t border-pmk-tint-border py-8 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10"
    >
      <div className="md:pt-1">
        <h2 id={id} className="text-base font-medium text-pmk-ink">
          {title}
        </h2>
        <div className="mt-1 text-sm text-pmk-muted">{description}</div>
      </div>
      <div className="rounded-2xl bg-pmk-tint p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const { allowed, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const settings = await getOrgSettings();

  return (
    <div className="max-w-5xl">
      <PageHeader title="Settings" description="How PI-CORE presents PMK ITERA and how people log in." />

      <SettingsRow
        id="org-title"
        title="Organization"
        description={
          isSuperAdmin
            ? "The name in the sidebar and on every screen. The logo is bundled with the app; replacing it is a code change (see README)."
            : "Only a super admin can change the organization name."
        }
      >
        <div className="flex items-start gap-4">
          <Image src="/brand/pmk-logo-192.png" alt="PMK ITERA logo" width={56} height={56} className="shrink-0" />
          <div className="min-w-0 flex-1">
            {isSuperAdmin ? (
              <OrgForm orgName={settings?.org_name ?? ""} />
            ) : (
              <p className="pt-3 text-sm font-medium text-pmk-ink">{settings?.org_name}</p>
            )}
          </div>
        </div>
      </SettingsRow>

      <SettingsRow
        id="auth-config"
        title="Authentication"
        description="Read-only in this version. Public sign-up is disabled; only admins create accounts."
      >
        <ul className="divide-y divide-pmk-tint-border">
          {AUTH_METHODS.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-pmk-ink">{m.label}</p>
                <p className="text-sm text-pmk-muted">{m.note}</p>
              </div>
              {m.enabled ? <Tag tone="positive">Enabled</Tag> : <Tag>Not yet</Tag>}
            </li>
          ))}
        </ul>
      </SettingsRow>
    </div>
  );
}
