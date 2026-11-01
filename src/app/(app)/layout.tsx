import { AppShell } from "@/components/shell/app-shell";
import { isAdminAccess, requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const member = await requireMember();
  const supabase = await createClient();
  const { data: org } = await supabase.from("org_settings").select("org_name").maybeSingle();
  return (
    <AppShell
      isAdmin={isAdminAccess(member.access)}
      isSuperAdmin={member.access === "super_admin"}
      orgName={org?.org_name ?? "PMK ITERA"}
    >
      {children}
    </AppShell>
  );
}
