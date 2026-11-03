import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSuperAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getOrgUnit } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ConfirmAction } from "@/components/common/confirm-action";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader, SectionTitle, actionClass } from "@/components/common/surfaces";
import { InfoIcon } from "@/components/icons";
import { FormCard } from "@/components/common/form-controls";
import { deleteUnit, setUnitActive, updateUnit } from "../../actions";
import { UnitForm } from "../../unit-form";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.structure.editUnitTitle };
}

export default async function EditUnitPage({ params }: PageProps<"/structure/units/[id]">) {
  const { allowed } = await requireSuperAdminPage();
  if (!allowed) return <ForbiddenState superAdmin />;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [detail, { d }] = await Promise.all([getOrgUnit(id.data), getI18n()]);
  const s = d.structure;
  if (!detail || detail.unit.type === "organization") notFound();
  const { unit, childCount, assignmentCount } = detail;
  const deleteBlocked =
    childCount || assignmentCount ? s.deleteUnitBlocked(unit.name, childCount, assignmentCount) : undefined;

  return (
    <div className="max-w-2xl space-y-8">
      <section>
        <PageHeader
          title={unit.name}
          description={s.unitDescription(d.unitType[unit.type], childCount, assignmentCount)}
          back={{ href: "/structure", label: d.nav.structure }}
        />
        {!unit.is_active ? (
          <p
            role="status"
            className="mb-4 flex items-start gap-2.5 rounded-2xl border border-pmk-tint-border bg-pmk-tint px-4 py-3 text-sm font-semibold text-pmk-ink"
          >
            <InfoIcon className="mt-px size-5 shrink-0 text-pmk-muted" aria-hidden />
            {s.unitInactive}
          </p>
        ) : null}
        <FormCard>
          <UnitForm
            action={updateUnit.bind(null, unit.id)}
            defaults={{ name: unit.name, sortOrder: unit.sort_order }}
            submitLabel={d.common.saveChanges}
          />
        </FormCard>
      </section>
      <section
        className="rounded-[20px] border border-pmk-tint-border bg-white p-5 shadow-[var(--pmk-shadow-card)]"
        aria-labelledby="unit-status"
      >
        <SectionTitle id="unit-status">{s.status}</SectionTitle>
        <p className="mb-4 mt-1 text-sm text-pmk-muted">{s.statusBody}</p>
        <div className="flex flex-wrap gap-3">
          {unit.is_active ? (
            <ConfirmAction
              action={setUnitActive.bind(null, unit.id, false)}
              title={s.deactivateTitle(unit.name)}
              description={s.deactivateBody}
              confirmLabel={s.deactivate}
              destructive
            >
              <button type="button" className={actionClass("secondary")}>
                {s.deactivateUnit}
              </button>
            </ConfirmAction>
          ) : (
            <ConfirmAction
              action={setUnitActive.bind(null, unit.id, true)}
              title={s.reactivateTitle(unit.name)}
              description={s.reactivateBody}
              confirmLabel={s.reactivate}
            >
              <button type="button" className={actionClass("primary")}>
                {s.reactivateUnit}
              </button>
            </ConfirmAction>
          )}
          <ConfirmAction
            action={deleteUnit.bind(null, unit.id)}
            title={s.deleteTitle(unit.name)}
            description={s.cannotUndo}
            confirmLabel={s.delete}
            destructive
            redirectTo="/structure"
            blockedReason={deleteBlocked}
          >
            <button type="button" className={actionClass("danger-outline")}>
              {s.deleteUnit}
            </button>
          </ConfirmAction>
        </div>
      </section>
    </div>
  );
}
