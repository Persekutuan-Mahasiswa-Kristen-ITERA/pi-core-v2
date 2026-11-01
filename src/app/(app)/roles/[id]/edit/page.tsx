import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdminPage } from "@/lib/auth";
import { getRoleDetail } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ForbiddenState } from "@/components/common/states";
import { SectionTitle } from "@/components/common/surfaces";
import { updateRole } from "../../actions";
import { RoleForm } from "../../role-form";

export const metadata: Metadata = { title: "Edit role" };

export default async function EditRolePage({ params }: PageProps<"/roles/[id]/edit">) {
  const { allowed } = await requireSuperAdminPage();
  if (!allowed) return <ForbiddenState superAdmin />;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const detail = await getRoleDetail(id.data);
  if (!detail) notFound();
  const { role } = detail;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <SectionTitle>Edit Role</SectionTitle>
      <RoleForm
        action={updateRole.bind(null, role.id!)}
        defaults={{ name: role.name!, description: role.description, grantsAdmin: role.grants_admin! }}
        submitLabel="Save changes"
        cancelHref={`/roles/${role.id}`}
      />
      <p className="text-sm text-pmk-body">
        Which positions carry this role is set on each position under{" "}
        <Link href="/structure" className="font-semibold text-pmk-accent hover:underline">
          Structure
        </Link>
        .
      </p>
    </div>
  );
}
