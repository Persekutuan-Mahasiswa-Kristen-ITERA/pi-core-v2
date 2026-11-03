import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getAssignment } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { AssignmentForm } from "../assignment-form";
import { updateAssignment } from "../actions";
import { getAssignmentFormOptions } from "../form-options";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.assignments.editTitle };
}

export default async function EditAssignmentPage({ params }: PageProps<"/assignments/[id]">) {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [assignment, options, { d }] = await Promise.all([
    getAssignment(id.data),
    getAssignmentFormOptions(),
    getI18n(),
  ]);
  if (!assignment) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader title={d.assignments.editTitle} back={{ href: "/assignments", label: d.nav.assignments }} />
      <FormCard>
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
      </FormCard>
    </div>
  );
}
