import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { ForbiddenState } from "@/components/common/states";
import { SectionTitle } from "@/components/common/surfaces";
import { createPeriod } from "../actions";
import { PeriodForm } from "../period-form";

export const metadata: Metadata = { title: "Create period" };

export default async function NewPeriodPage() {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <SectionTitle>Create Period</SectionTitle>
      <PeriodForm action={createPeriod} submitLabel="Create period" />
    </div>
  );
}
