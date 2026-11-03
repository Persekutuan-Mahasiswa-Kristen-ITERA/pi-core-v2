import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { createMember } from "../actions";
import { MemberForm } from "../member-form";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.members.newTitle };
}

export default async function NewMemberPage() {
  const { allowed, isSuperAdmin } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const { d } = await getI18n();
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={d.members.newTitle}
        description={d.members.newDescription}
        back={{ href: "/members", label: d.nav.members }}
      />
      <FormCard>
        <MemberForm mode="create" action={createMember} canSetAccess={isSuperAdmin} />
      </FormCard>
    </div>
  );
}
