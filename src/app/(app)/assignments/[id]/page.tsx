import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { getAssignment } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ForbiddenState } from "@/components/common/states";
import { SectionTitle } from "@/components/common/surfaces";
import { AssignmentForm } from "../assignment-form";
import { updateAssignment } from "../actions";
import { getAssignmentFormOptions } from "../form-options";

export const metadata: Metadata = { title: "Edit assignment" };

export default async function EditAssignmentPage({ params }: PageProps<"/assignments/[id]">) {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [assignment, options] = await Promise.all([getAssignment(id.data), getAssignmentFormOptions()]);
  if (!assignment) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SectionTitle>Edit Assignment</SectionTitle>
      <AssignmentForm
        mode="edit"
        action={updateAssignment.bind(null, assignment.id)}
        members={options.members}
        units={options.units}
        positions={options.positions}
        periods={options.periods}
        defaults={{
          memberId: assignment.member_id,
          orgUnitId: assignment.org_unit_id,
          positionId: assignment.position_id,
          periodId: assignment.period_id,
        }}
      />
    </div>
  );
}
