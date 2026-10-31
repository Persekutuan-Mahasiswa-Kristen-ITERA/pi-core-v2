import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { getAssignment, listActiveMembersForPicker, listPeriods, listRolesWithPositions } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ForbiddenState } from "@/components/common/states";
import { SectionTitle } from "@/components/common/surfaces";
import { AssignmentForm } from "../assignment-form";
import { updateAssignment } from "../actions";

export const metadata: Metadata = { title: "Edit assignment" };

export default async function EditAssignmentPage({ params }: PageProps<"/assignments/[id]">) {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [assignment, members, roles, periods] = await Promise.all([
    getAssignment(id.data),
    listActiveMembersForPicker(),
    listRolesWithPositions(),
    listPeriods(),
  ]);
  if (!assignment) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SectionTitle>Edit Assignment</SectionTitle>
      <AssignmentForm
        mode="edit"
        action={updateAssignment.bind(null, assignment.id)}
        members={members.map((m) => ({ id: m.id, label: `${m.full_name} · ${m.email}` }))}
        roles={roles.map((r) => ({ id: r.id, name: r.name, positions: r.positions }))}
        periods={periods.map((p) => ({ id: p.id, label: p.is_active ? `${p.label} (active)` : p.label }))}
        defaults={{
          memberId: assignment.member_id,
          roleId: assignment.role_id,
          positionId: assignment.position_id,
          periodId: assignment.period_id,
        }}
      />
    </div>
  );
}
