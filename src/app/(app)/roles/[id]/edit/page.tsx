import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { getRoleDetail } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ForbiddenState } from "@/components/common/states";
import { SectionTitle } from "@/components/common/surfaces";
import { updateRole } from "../../actions";
import { RoleForm } from "../../role-form";
import { PositionsEditor } from "./positions-editor";

export const metadata: Metadata = { title: "Edit role" };

export default async function EditRolePage({ params }: PageProps<"/roles/[id]/edit">) {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const detail = await getRoleDetail(id.data);
  if (!detail) notFound();
  const { role, positions } = detail;
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <section className="space-y-4">
        <SectionTitle>Edit Role</SectionTitle>
        <RoleForm
          action={updateRole.bind(null, role.id!)}
          defaults={{ name: role.name!, description: role.description }}
          submitLabel="Save changes"
          cancelHref={`/roles/${role.id}`}
        />
      </section>
      <section className="space-y-3" aria-labelledby="positions-title">
        <SectionTitle id="positions-title">Positions</SectionTitle>
        <p className="text-sm text-pmk-body">
          Positions are the titles inside this role (e.g. Ketua Umum). Assignments pick one of them. A position in use
          cannot be deleted.
        </p>
        <PositionsEditor roleId={role.id!} positions={positions} />
      </section>
    </div>
  );
}
