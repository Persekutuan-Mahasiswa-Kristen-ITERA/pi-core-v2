import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { createMember } from "../actions";
import { MemberForm } from "../member-form";

export const metadata: Metadata = { title: "Create member" };

export default async function NewMemberPage() {
  const { allowed, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Create member"
        description="PI-CORE creates the login and shows a temporary password once. The member chooses their own password at first login."
        back={{ href: "/members", label: "Members" }}
      />
      <FormCard>
        <MemberForm mode="create" action={createMember} canSetAccess={isSuperAdmin} />
      </FormCard>
    </div>
  );
}
