import type { Metadata } from "next";
import Image from "next/image";
import { CircleCheck, Circle } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { getOrgSettings } from "@/lib/queries";
import { AUTH_METHODS } from "@/lib/app-config";
import { ForbiddenState } from "@/components/common/states";
import { OrgForm } from "./org-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const settings = await getOrgSettings();

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <section aria-label="Organization identity" className="flex flex-col items-center gap-4 pt-4 text-center">
        <Image src="/brand/pmk-logo.png" alt="PMK ITERA logo" width={84} height={84} unoptimized />
        <OrgForm orgName={settings?.org_name ?? ""} />
        <p className="text-xs text-pmk-body">The logo is bundled with the app. Replacing it is a code change (see README).</p>
      </section>

      <section aria-labelledby="auth-config" className="space-y-3">
        <h2 id="auth-config" className="px-3 text-lg font-bold text-pmk-ink">
          Authentication Configuration
        </h2>
        <ul className="space-y-2">
          {AUTH_METHODS.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-pmk-tint bg-white px-4 py-3 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
              <div>
                <p className="text-sm font-semibold text-pmk-ink">{m.label}</p>
                <p className="text-xs text-pmk-body">{m.note}</p>
              </div>
              {m.enabled ? (
                <CircleCheck className="size-5 shrink-0 text-pmk-gold-strong" aria-label="Enabled" />
              ) : (
                <Circle className="size-5 shrink-0 text-pmk-gold-strong" aria-label="Not enabled" />
              )}
            </li>
          ))}
        </ul>
        <p className="px-3 text-xs text-pmk-body">Read-only in this version. Public sign-up is disabled; only admins create accounts.</p>
      </section>
    </div>
  );
}
