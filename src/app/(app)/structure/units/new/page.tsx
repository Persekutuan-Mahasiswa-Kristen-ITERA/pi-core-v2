import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSuperAdminPage } from "@/lib/auth";
import { CHILD_TYPES } from "@/lib/org-structure";
import { getOrgUnit } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { createUnit } from "../../actions";
import { UnitForm } from "../../unit-form";

export const metadata: Metadata = { title: "Add unit" };

export default async function NewUnitPage({ searchParams }: PageProps<"/structure/units/new">) {
  const { allowed } = await requireSuperAdminPage();
  if (!allowed) return <ForbiddenState superAdmin />;
  const parentParam = (await searchParams).parent;
  const parentId = idSchema.safeParse(typeof parentParam === "string" ? parentParam : undefined);
  if (!parentId.success) notFound();
  const parent = await getOrgUnit(parentId.data);
  if (!parent || !CHILD_TYPES[parent.unit.type].length) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader title={`Add unit under ${parent.unit.name}`} back={{ href: "/structure", label: "Structure" }} />
      <FormCard>
        <UnitForm
          action={createUnit}
          create={{ parentId: parent.unit.id, types: CHILD_TYPES[parent.unit.type] }}
          submitLabel="Add unit"
        />
      </FormCard>
    </div>
  );
}
