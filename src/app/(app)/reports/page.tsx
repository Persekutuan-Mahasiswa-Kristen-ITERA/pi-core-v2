import type { Metadata } from "next";
import { ChartNoAxesColumnIncreasing } from "lucide-react";
import { requireMember } from "@/lib/auth";

export const metadata: Metadata = { title: "Reports" };

/** The prototype has a Reports tab but no Reports design; this is an honest placeholder. */
export default async function ReportsPage() {
  await requireMember();
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <ChartNoAxesColumnIncreasing className="size-10 text-pmk-accent" aria-hidden />
      <h2 className="text-lg font-bold text-pmk-ink">Reports are coming later</h2>
      <p className="max-w-sm text-sm text-pmk-body">
        This version of PI-CORE manages members, roles, periods and assignments. Reports will be added in a future
        release.
      </p>
    </div>
  );
}
