import type { Metadata } from "next";
import { requireSuperAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { createRole } from "../actions";
import { RoleForm } from "../role-form";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.roles.newTitle };
}

export default async function NewRolePage() {
  const { allowed } = await requireSuperAdminPage();
  if (!allowed) return <ForbiddenState superAdmin />;
  const { d } = await getI18n();
  return (
    <div className="max-w-2xl">
      <PageHeader title={d.roles.newTitle} back={{ href: "/roles", label: d.nav.roles }} />
      <FormCard>
        <RoleForm action={createRole} submitLabel={d.roles.newTitle} cancelHref="/roles" />
      </FormCard>
    </div>
  );
}
