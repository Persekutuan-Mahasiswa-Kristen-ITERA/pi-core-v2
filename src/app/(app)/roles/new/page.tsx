import type { Metadata } from "next";
import { requireSuperAdminPage } from "@/lib/auth";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { createRole } from "../actions";
import { RoleForm } from "../role-form";

export const metadata: Metadata = { title: "Create role" };

export default async function NewRolePage() {
  const { allowed } = await requireSuperAdminPage();
  if (!allowed) return <ForbiddenState superAdmin />;
  return (
    <div className="max-w-2xl">
      <PageHeader title="Create role" back={{ href: "/roles", label: "Roles" }} />
      <FormCard>
        <RoleForm action={createRole} submitLabel="Create role" cancelHref="/roles" />
      </FormCard>
    </div>
  );
}
