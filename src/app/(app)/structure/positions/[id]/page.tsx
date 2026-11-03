import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSuperAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getPosition, listRolesForPicker } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ConfirmAction } from "@/components/common/confirm-action";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader, actionClass } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { deletePosition, updatePosition } from "../../actions";
import { PositionForm } from "../../position-form";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.structure.editPositionMeta };
}

export default async function EditPositionPage({ params }: PageProps<"/structure/positions/[id]">) {
  const { allowed } = await requireSuperAdminPage();
  if (!allowed) return <ForbiddenState superAdmin />;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [position, roles, { d }] = await Promise.all([getPosition(id.data), listRolesForPicker(), getI18n()]);
  const s = d.structure;
  if (!position) notFound();
  return (
    <div className="max-w-2xl space-y-8">
      <section>
        <PageHeader title={s.editPositionTitle(position.name)} back={{ href: "/structure", label: d.nav.structure }} />
        <FormCard>
          <PositionForm
            action={updatePosition.bind(null, position.id)}
            roles={roles}
            defaults={position}
            fixedUnitType
            submitLabel={d.common.saveChanges}
          />
        </FormCard>
      </section>
      <section
        aria-labelledby="danger-title"
        className="rounded-[20px] border border-pmk-tint-border bg-white p-5 shadow-[var(--pmk-shadow-card)]"
      >
        <h2 id="danger-title" className="text-[19px] font-bold text-pmk-ink">
          {s.deletePositionTitle}
        </h2>
        <p className="mb-4 mt-1 text-sm text-pmk-muted">
          {position.usage ? s.positionUsed(position.usage) : s.positionUnused}
        </p>
        <ConfirmAction
          action={deletePosition.bind(null, position.id)}
          title={s.deletePositionConfirm(position.name)}
          description={s.cannotUndo}
          confirmLabel={s.delete}
          destructive
          redirectTo="/structure"
          blockedReason={position.usage ? s.positionBlocked(position.usage) : undefined}
        >
          <button type="button" className={actionClass("danger-outline")}>
            {s.deletePosition}
          </button>
        </ConfirmAction>
      </section>
    </div>
  );
}
