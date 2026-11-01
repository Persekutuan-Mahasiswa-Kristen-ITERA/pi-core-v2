import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSuperAdminPage } from "@/lib/auth";
import { UNIT_TYPE_LABEL } from "@/lib/org-structure";
import { getOrgUnit } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/common/confirm-action";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader, SectionTitle } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
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
    <div className="max-w-2xl space-y-8">
      <section>
        <PageHeader
          title={unit.name}
          description={`${UNIT_TYPE_LABEL[unit.type]} · ${childCount} sub-unit${childCount === 1 ? "" : "s"} · ${assignmentCount} assignment${assignmentCount === 1 ? "" : "s"} across all periods`}
          back={{ href: "/structure", label: "Structure" }}
        />
        {!unit.is_active ? (
          <p role="status" className="mb-4 rounded-[10px] bg-pmk-tint px-4 py-3 text-sm font-medium text-pmk-ink">
            Inactive: no new assignments can be made in this unit.
          </p>
        ) : null}
        <FormCard>
          <UnitForm
            action={updateUnit.bind(null, unit.id)}
            defaults={{ name: unit.name, sortOrder: unit.sort_order }}
            submitLabel="Save changes"
          />
        </FormCard>
      </section>
      <section className="rounded-2xl border border-pmk-tint-border p-5" aria-labelledby="unit-status">
        <SectionTitle id="unit-status">Status</SectionTitle>
        <p className="mb-4 mt-1 text-sm text-pmk-muted">
          Deactivate a unit to stop new assignments while keeping its history. Only an empty unit can be deleted.
        </p>
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
