import type { Metadata } from "next";
import { requireSuperAdminPage } from "@/lib/auth";
import { listRolesForPicker } from "@/lib/queries";
import { ForbiddenState } from "@/components/common/states";
import { SectionTitle } from "@/components/common/surfaces";
import { createPosition } from "../../actions";
import { PositionForm } from "../../position-form";

export const metadata: Metadata = { title: "Create position" };

export default async function NewPositionPage() {
  const { allowed } = await requireSuperAdminPage();
  if (!allowed) return <ForbiddenState superAdmin />;
  const roles = await listRolesForPicker();
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <SectionTitle>Create Position</SectionTitle>
      <PositionForm action={createPosition} roles={roles} submitLabel="Create position" />
    </div>
  );
}
