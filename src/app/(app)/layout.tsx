import { AppShell } from "@/components/shell/app-shell";
import { isAdminAccess, requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ACCESS_LABEL = { super_admin: "Super admin", admin: "Admin", member: "Member" } as const;

async function getOrgName() {
  const supabase = await createClient();
  const { data } = await supabase.from("org_settings").select("org_name").maybeSingle();
  return data?.org_name ?? "PMK ITERA";
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Independent reads, fetched together.
  const [member, orgName] = await Promise.all([requireMember(), getOrgName()]);
  return (
    <AppShell
      isAdmin={isAdminAccess(member.access)}
      isSuperAdmin={member.access === "super_admin"}
      orgName={orgName}
      viewer={{ fullName: member.fullName, accessLabel: ACCESS_LABEL[member.access] }}
    >
      {children}
    </AppShell>
  );
}
