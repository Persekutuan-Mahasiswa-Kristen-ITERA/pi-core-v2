"use client";

import { useRouter } from "next/navigation";

export function PeriodFilter({ value, periods }: { value: string; periods: { id: string; label: string }[] }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm text-pmk-body">
      Period
      <select
        value={value}
        onChange={(e) => router.replace(`/assignments?period=${encodeURIComponent(e.target.value)}`)}
        className="h-11 rounded-lg border border-pmk-tint-border bg-pmk-tint px-3 text-sm font-medium text-pmk-ink focus-visible:outline-2 focus-visible:outline-pmk-accent"
      >
        <option value="all">All periods</option>
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}
