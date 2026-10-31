"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Search } from "lucide-react";

type Option = { id: string; label: string };

const selectClass =
  "h-11 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 text-xs font-medium text-pmk-body focus-visible:border-pmk-accent focus-visible:outline-none";

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
      className="space-y-2"
    >
      <div className="relative">
        <label htmlFor="member-search" className="sr-only">
          Search member by name or email
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-pmk-brown" aria-hidden />
        <input
          id="member-search"
          name="q"
          type="search"
          defaultValue={params.get("q") ?? ""}
          placeholder="Search member ..."
          enterKeyHint="search"
          className="h-11 w-full rounded-xl bg-pmk-tint pl-12 pr-10 text-center text-base font-medium text-pmk-ink placeholder:text-pmk-ink focus-visible:outline-2 focus-visible:outline-pmk-accent sm:text-sm"
        />
        {pending ? <Loader2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-pmk-muted" aria-label="Loading" /> : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 px-2">
        <label className="flex min-w-[9rem] flex-1 items-center gap-1 text-xs text-pmk-body">
          <span className="shrink-0">Filter Role :</span>
          <select name="role" defaultValue={params.get("role") ?? ""} onChange={(e) => apply(e.currentTarget.form!)} className={selectClass}>
            <option value="">[ALL]</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[9rem] flex-1 items-center gap-1 text-xs text-pmk-body">
          <span className="shrink-0">Filter Period :</span>
          <select name="period" defaultValue={params.get("period") ?? ""} onChange={(e) => apply(e.currentTarget.form!)} className={selectClass}>
            <option value="">[ALL]</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[9rem] flex-1 items-center gap-1 text-xs text-pmk-body">
          <span className="shrink-0">Status :</span>
          <select name="status" defaultValue={params.get("status") ?? ""} onChange={(e) => apply(e.currentTarget.form!)} className={selectClass}>
            <option value="">Active</option>
            <option value="inactive">Deactivated</option>
          </select>
        </label>
        <noscript>
          <button type="submit" className="min-h-11 px-3 text-xs font-semibold text-pmk-accent">
            Apply
          </button>
        </noscript>
      </div>
    </form>
  );
}
