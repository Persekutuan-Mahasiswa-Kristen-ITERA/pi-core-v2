import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { getPeriod } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ForbiddenState } from "@/components/common/states";
import { PageHeader } from "@/components/common/surfaces";
import { FormCard } from "@/components/common/form-controls";
import { updatePeriod } from "../actions";
import { PeriodForm } from "../period-form";

export const metadata: Metadata = { title: "Edit period" };

export default async function EditPeriodPage({ params }: PageProps<"/periods/[id]">) {
  const { allowed } = await requireAdminPage();
  if (!allowed) return <ForbiddenState />;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const period = await getPeriod(id.data);
  if (!period) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`Edit ${period.label}`}
        description={period.is_active ? "This is the active period." : undefined}
        back={{ href: "/periods", label: "Periods" }}
      />
      <FormCard>
        <PeriodForm
          action={updatePeriod.bind(null, period.id)}
          defaults={{ label: period.label, startsOn: period.starts_on, endsOn: period.ends_on }}
          submitLabel="Save changes"
        />
      </FormCard>
    </div>
  );
}
