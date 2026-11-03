import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSuperAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { CHILD_TYPES } from "@/lib/org-structure";
import { getOrgUnit } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { createUnit } from "../../actions";
import { UnitForm } from "../../unit-form";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.structure.addUnit };
}

export default async function NewUnitPage({ searchParams }: PageProps<"/structure/units/new">) {
  const { allowed } = await requireSuperAdminPage();
  if (!allowed) return <ForbiddenState superAdmin />;
  const parentParam = (await searchParams).parent;
  const parentId = idSchema.safeParse(typeof parentParam === "string" ? parentParam : undefined);
  if (!parentId.success) notFound();
  const [parent, { d }] = await Promise.all([getOrgUnit(parentId.data), getI18n()]);
  if (!parent || !CHILD_TYPES[parent.unit.type].length) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={d.structure.newUnitTitle(parent.unit.name)}
        back={{ href: "/structure", label: d.nav.structure }}
      />
      <FormCard>
        <UnitForm
          action={createUnit}
          create={{ parentId: parent.unit.id, types: CHILD_TYPES[parent.unit.type] }}
          submitLabel={d.structure.addUnit}
        />
      </FormCard>
    </div>
  );
}
