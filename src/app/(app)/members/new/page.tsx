import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { ForbiddenState } from "@/components/common/states";
import { SectionTitle } from "@/components/common/surfaces";
import { createMember } from "../actions";
import { MemberForm } from "../member-form";

export const metadata: Metadata = { title: "Create member" };

export default async function NewMemberPage() {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <SectionTitle>Create Member</SectionTitle>
      <p className="text-sm text-pmk-body">
        PI-CORE creates the login and shows a temporary password once. The member chooses their own password at first
        login.
      </p>
      <MemberForm mode="create" action={createMember} />
    </div>
  );
}
