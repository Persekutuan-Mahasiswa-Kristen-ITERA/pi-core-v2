import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSuperAdminPage } from "@/lib/auth";
import { UNIT_TYPE_LABEL } from "@/lib/org-structure";
import { getOrgUnit } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/common/confirm-action";
import { ForbiddenState } from "@/components/common/states";
import { SectionTitle } from "@/components/common/surfaces";
import { deleteUnit, setUnitActive, updateUnit } from "../../actions";
import { UnitForm } from "../../unit-form";

export const metadata: Metadata = { title: "Edit unit" };

export default async function EditUnitPage({ params }: PageProps<"/structure/units/[id]">) {
  const { allowed } = await requireSuperAdminPage();
  if (!allowed) return <ForbiddenState superAdmin />;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const detail = await getOrgUnit(id.data);
  if (!detail || detail.unit.type === "organization") notFound();
  const { unit, childCount, assignmentCount } = detail;
  const deleteBlocked =
    childCount || assignmentCount
      ? `${unit.name} has ${childCount} sub-unit(s) and ${assignmentCount} assignment(s) across all periods. Deactivate it instead to keep that history.`
      : undefined;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <section className="space-y-4">
        <SectionTitle>Edit {UNIT_TYPE_LABEL[unit.type].toLowerCase()}</SectionTitle>
        {!unit.is_active ? (
          <p role="status" className="rounded-xl bg-pmk-tint px-4 py-3 text-sm font-medium text-pmk-ink">
            Inactive: no new assignments can be made in this unit.
          </p>
        ) : null}
        <UnitForm
          action={updateUnit.bind(null, unit.id)}
          defaults={{ name: unit.name, sortOrder: unit.sort_order }}
          submitLabel="Save changes"
        />
      </section>
      <section className="space-y-3" aria-labelledby="unit-status">
        <SectionTitle id="unit-status">Status</SectionTitle>
        <div className="flex flex-wrap gap-3">
          {unit.is_active ? (
            <ConfirmAction
              action={setUnitActive.bind(null, unit.id, false)}
              title={`Deactivate ${unit.name}?`}
              description="Existing assignments are kept. No new assignments can be made in this unit until it is reactivated."
              confirmLabel="Deactivate"
              destructive
            >
              <Button variant="outline" className="h-11 rounded-full px-5">
                Deactivate unit
              </Button>
            </ConfirmAction>
          ) : (
            <ConfirmAction
              action={setUnitActive.bind(null, unit.id, true)}
              title={`Reactivate ${unit.name}?`}
              description="Admins can assign members to this unit again."
              confirmLabel="Reactivate"
            >
              <Button className="h-11 rounded-full px-5">Reactivate unit</Button>
            </ConfirmAction>
          )}
          <ConfirmAction
            action={deleteUnit.bind(null, unit.id)}
            title={`Delete ${unit.name}?`}
            description="This cannot be undone."
            confirmLabel="Delete"
            destructive
            redirectTo="/structure"
            blockedReason={deleteBlocked}
          >
            <Button variant="destructive" className="h-11 rounded-full px-5">
              Delete unit
            </Button>
          </ConfirmAction>
        </div>
      </section>
    </div>
  );
}
