import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSuperAdminPage } from "@/lib/auth";
import { getPosition, listRolesForPicker } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/common/confirm-action";
import { ForbiddenState } from "@/components/common/states";
import { SectionTitle } from "@/components/common/surfaces";
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
    <div className="mx-auto max-w-xl space-y-8">
      <section className="space-y-4">
        <SectionTitle>Edit Position</SectionTitle>
        <PositionForm
          action={updatePosition.bind(null, position.id)}
          roles={roles}
          defaults={position}
          fixedUnitType
          submitLabel="Save changes"
        />
      </section>
      <ConfirmAction
        action={deletePosition.bind(null, position.id)}
        title={`Delete position ${position.name}?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        redirectTo="/structure"
        blockedReason={
          position.usage ? `${position.usage} assignment(s) use this position. Remove or change them first.` : undefined
        }
      >
        <Button variant="destructive" className="h-11 rounded-full px-5">
          Delete position
        </Button>
      </ConfirmAction>
    </div>
  );
}
