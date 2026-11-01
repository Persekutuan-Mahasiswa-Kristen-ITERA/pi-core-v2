"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Search } from "lucide-react";

type Option = { id: string; label: string };

const selectClass =
  "h-10 w-full min-w-0 rounded-[10px] border border-pmk-control bg-white pl-3 pr-8 text-sm text-pmk-ink focus-visible:border-pmk-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-pmk-accent/15";

/** Works without JavaScript (a GET form); with JS, selects apply immediately. */
export function MemberFilters({ roles, periods }: { roles: Option[]; periods: Option[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(form: HTMLFormElement) {
    const data = new FormData(form);
    const next = new URLSearchParams();
    for (const key of ["q", "role", "period", "status"]) {
      const value = String(data.get(key) ?? "").trim();
      if (value) next.set(key, value);
    }
    startTransition(() => router.replace(`/members${next.size ? `?${next}` : ""}`));
  }

  return (
    <form
      action="/members"
      method="get"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
      className="mb-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_repeat(3,10.5rem)]"
    >
      <div className="relative">
        <label htmlFor="member-search" className="sr-only">
          Search member by name or email
        </label>
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-pmk-muted"
          aria-hidden
        />
        <input
          id="member-search"
          name="q"
          type="search"
          defaultValue={params.get("q") ?? ""}
          placeholder="Search by name or email"
          enterKeyHint="search"
          className="h-11 w-full rounded-[10px] border border-pmk-control bg-white pl-10 pr-10 text-base text-pmk-ink placeholder:text-pmk-muted focus-visible:border-pmk-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-pmk-accent/15 md:h-10 md:text-sm"
        />
        {pending ? (
          <Loader2
            className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-pmk-muted"
            aria-label="Loading"
          />
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2 md:contents">
        <label className="min-w-0">
          <span className="sr-only">Filter by role</span>
          <select
            name="role"
            defaultValue={params.get("role") ?? ""}
            onChange={(e) => apply(e.currentTarget.form!)}
            className={selectClass}
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0">
          <span className="sr-only">Filter by period</span>
          <select
            name="period"
            defaultValue={params.get("period") ?? ""}
            onChange={(e) => apply(e.currentTarget.form!)}
            className={selectClass}
          >
            <option value="">All periods</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0">
          <span className="sr-only">Status</span>
          <select
            name="status"
            defaultValue={params.get("status") ?? ""}
            onChange={(e) => apply(e.currentTarget.form!)}
            className={selectClass}
          >
            <option value="">Active</option>
            <option value="inactive">Deactivated</option>
          </select>
        </label>
      </div>
      <noscript>
        <button type="submit" className="h-10 px-3 text-sm font-semibold text-pmk-accent">
          Apply
        </button>
      </noscript>
    </form>
  );
}
