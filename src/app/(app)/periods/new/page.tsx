import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { createPeriod } from "../actions";
import { PeriodForm } from "../period-form";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.periods.newTitle };
}

export default async function NewPeriodPage() {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const { d } = await getI18n();
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={d.periods.newTitle}
        description={d.periods.newDescription}
        back={{ href: "/periods", label: d.nav.periods }}
      />
      <FormCard>
        <PeriodForm action={createPeriod} submitLabel={d.periods.newTitle} />
      </FormCard>
    </div>
  );
}
