import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSuperAdminPage } from "@/lib/auth";
import { getPosition, listRolesForPicker } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/common/confirm-action";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { deletePosition, updatePosition } from "../../actions";
import { PositionForm } from "../../position-form";

export const metadata: Metadata = { title: "Edit position" };

export default async function EditPositionPage({ params }: PageProps<"/structure/positions/[id]">) {
  const { allowed } = await requireSuperAdminPage();
  if (!allowed) return <ForbiddenState superAdmin />;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [position, roles] = await Promise.all([getPosition(id.data), listRolesForPicker()]);
  if (!position) notFound();
  return (
    <div className="max-w-2xl space-y-8">
      <section>
        <PageHeader title={`Edit ${position.name}`} back={{ href: "/structure", label: "Structure" }} />
        <FormCard>
          <PositionForm
            action={updatePosition.bind(null, position.id)}
            roles={roles}
            defaults={position}
            fixedUnitType
            submitLabel="Save changes"
          />
        </FormCard>
      </section>
      <section aria-labelledby="danger-title" className="rounded-2xl border border-pmk-tint-border p-5">
        <h2 id="danger-title" className="text-base font-semibold text-pmk-ink">
          Delete this position
        </h2>
        <p className="mb-4 mt-1 text-sm text-pmk-muted">
          {position.usage
            ? `Used by ${position.usage} assignment(s). Remove or change them first.`
            : "Not used by any assignment. Deleting cannot be undone."}
        </p>
        <ConfirmAction
          action={deletePosition.bind(null, position.id)}
          title={`Delete position ${position.name}?`}
          description="This cannot be undone."
          confirmLabel="Delete"
          destructive
          redirectTo="/structure"
          blockedReason={
            position.usage
              ? `${position.usage} assignment(s) use this position. Remove or change them first.`
              : undefined
          }
        >
          <Button variant="destructive" className="h-11 rounded-full px-5">
            Delete position
          </Button>
        </ConfirmAction>
      </section>
    </div>
  );
}
