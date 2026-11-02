import type { Metadata } from "next";
import { requireSuperAdminPage } from "@/lib/auth";
import { listRolesForPicker } from "@/lib/queries";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { createPosition } from "../../actions";
import { PositionForm } from "../../position-form";

export const metadata: Metadata = { title: "Create position" };

export default async function NewPositionPage() {
  const { allowed } = await requireSuperAdminPage();
  if (!allowed) return <ForbiddenState superAdmin />;
  const roles = await listRolesForPicker();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Create position" back={{ href: "/structure", label: "Structure" }} />
      <FormCard>
        <PositionForm action={createPosition} roles={roles} submitLabel="Create position" />
      </FormCard>
    </div>
  );
}
