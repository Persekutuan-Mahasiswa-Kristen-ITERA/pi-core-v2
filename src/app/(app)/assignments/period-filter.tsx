"use client";

import { useRouter } from "next/navigation";
import { useDict } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Period chip (a native select drawn as the prototype's filter pill). */
export function PeriodFilter({ value, periods }: { value: string; periods: { id: string; label: string }[] }) {
  const router = useRouter();
  const d = useDict();
  const on = value !== "all";
  return (
    <label className="flex items-center gap-2 text-sm text-pmk-muted">
      <span className="sr-only">{d.assignments.period}</span>
      <select
        value={value}
        onChange={(e) => router.replace(`/assignments?period=${encodeURIComponent(e.target.value)}`)}
        className={cn(
          "pmk-press h-10 appearance-none rounded-full border pl-4 pr-9 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pmk-accent",
          on
            ? "pmk-chevron-white border-pmk-brown bg-pmk-brown text-white"
            : "pmk-chevron-ink border-pmk-tint-border bg-white text-pmk-ink",
        )}
      >
        <option value="all">{d.assignments.allPeriods}</option>
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}
