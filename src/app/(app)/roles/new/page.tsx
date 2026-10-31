import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { ForbiddenState } from "@/components/common/states";
import { SectionTitle } from "@/components/common/surfaces";
import { createRole } from "../actions";
import { RoleForm } from "../role-form";

export const metadata: Metadata = { title: "Create role" };

export default async function NewRolePage() {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <SectionTitle>Create Role</SectionTitle>
      <RoleForm action={createRole} submitLabel="Create role" cancelHref="/roles" />
    </div>
  );
}
