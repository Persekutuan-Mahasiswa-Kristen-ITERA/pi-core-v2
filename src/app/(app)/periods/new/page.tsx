import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { createPeriod } from "../actions";
import { PeriodForm } from "../period-form";

export const metadata: Metadata = { title: "Create period" };

export default async function NewPeriodPage() {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Create period"
        description="One academic year of kepengurusan. The first period becomes active automatically."
        back={{ href: "/periods", label: "Periods" }}
      />
      <FormCard>
        <PeriodForm action={createPeriod} submitLabel="Create period" />
      </FormCard>
    </div>
  );
}
