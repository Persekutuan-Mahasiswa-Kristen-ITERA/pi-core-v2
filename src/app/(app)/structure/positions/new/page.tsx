import type { Metadata } from "next";
import { requireSuperAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { listRolesForPicker } from "@/lib/queries";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { createPosition } from "../../actions";
import { PositionForm } from "../../position-form";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.structure.newPositionTitle };
}

export default async function NewPositionPage() {
  const { allowed } = await requireSuperAdminPage();
  if (!allowed) return <ForbiddenState superAdmin />;
  const [roles, { d }] = await Promise.all([listRolesForPicker(), getI18n()]);
  return (
    <div className="max-w-2xl">
      <PageHeader title={d.structure.newPositionTitle} back={{ href: "/structure", label: d.nav.structure }} />
      <FormCard>
        <PositionForm action={createPosition} roles={roles} submitLabel={d.structure.newPositionTitle} />
      </FormCard>
    </div>
  );
}
