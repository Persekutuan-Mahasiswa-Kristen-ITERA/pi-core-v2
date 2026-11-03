import { AppShell } from "@/components/shell/app-shell";
import { isAdminAccess, requireMember } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getActivePeriod } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

async function getOrgName() {
  const supabase = await createClient();
  const { data } = await supabase.from("org_settings").select("org_name").maybeSingle();
  return data?.org_name ?? "PMK ITERA";
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Independent reads, fetched together.
  const [member, orgName, period, { d }] = await Promise.all([
    requireMember(),
    getOrgName(),
    getActivePeriod(),
    getI18n(),
  ]);
  return (
    <AppShell
      isAdmin={isAdminAccess(member.access)}
      isSuperAdmin={member.access === "super_admin"}
      orgName={orgName}
      activePeriod={period?.label ?? null}
      viewer={{ fullName: member.fullName, accessLabel: d.access[member.access] }}
    >
      {children}
    </AppShell>
  );
}
