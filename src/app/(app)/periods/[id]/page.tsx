import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { getPeriod } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { ForbiddenState } from "@/components/common/states";
import { SectionTitle } from "@/components/common/surfaces";
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
    <div className="mx-auto max-w-xl space-y-4">
      <SectionTitle>Edit {period.label}</SectionTitle>
      {period.is_active ? <p className="text-sm text-pmk-body">This is the active period.</p> : null}
      <PeriodForm
        action={updatePeriod.bind(null, period.id)}
        defaults={{ label: period.label, startsOn: period.starts_on, endsOn: period.ends_on }}
        submitLabel="Save changes"
      />
    </div>
  );
}
