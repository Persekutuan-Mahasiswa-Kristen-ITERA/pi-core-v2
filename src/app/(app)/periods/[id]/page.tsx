import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getPeriod } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { updatePeriod } from "../actions";
import { PeriodForm } from "../period-form";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.periods.title };
}

export default async function EditPeriodPage({ params }: PageProps<"/periods/[id]">) {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [period, { d }] = await Promise.all([getPeriod(id.data), getI18n()]);
  if (!period) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={d.periods.editTitle(period.label)}
        description={period.is_active ? d.periods.isActive : undefined}
        back={{ href: "/periods", label: d.nav.periods }}
      />
      <FormCard>
        <PeriodForm
          action={updatePeriod.bind(null, period.id)}
          defaults={{ label: period.label, startsOn: period.starts_on, endsOn: period.ends_on }}
          submitLabel={d.common.saveChanges}
        />
      </FormCard>
    </div>
  );
}
