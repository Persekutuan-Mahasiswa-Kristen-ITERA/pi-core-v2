"use client";

import { useRouter } from "next/navigation";

export function PeriodFilter({ value, periods }: { value: string; periods: { id: string; label: string }[] }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm text-pmk-muted">
      <span className="sr-only sm:not-sr-only">Period</span>
      <select
        value={value}
        onChange={(e) => router.replace(`/assignments?period=${encodeURIComponent(e.target.value)}`)}
        className="h-9 rounded-[10px] border border-pmk-control bg-white pl-3 pr-8 text-sm text-pmk-ink focus-visible:border-pmk-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-pmk-accent/15"
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
