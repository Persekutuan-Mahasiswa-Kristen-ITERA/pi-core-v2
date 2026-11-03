"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SearchIcon, SpinnerIcon } from "@/components/icons";
import { useDict } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string };

/** Filter pills: native selects (the platform picker on phones) drawn as the prototype's chips. */
const chipSelect = (on: boolean) =>
  cn(
    "pmk-press h-10 min-w-0 shrink-0 appearance-none rounded-full border pl-4 pr-9 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pmk-accent",
    on
      ? "pmk-chevron-white border-pmk-brown bg-pmk-brown text-white"
      : "pmk-chevron-ink border-pmk-tint-border bg-white text-pmk-ink",
  );

/** Works without JavaScript (a GET form); with JS, selects apply immediately. */
export function MemberFilters({ roles, periods }: { roles: Option[]; periods: Option[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const d = useDict();

  function apply(form: HTMLFormElement) {
    const data = new FormData(form);
    const next = new URLSearchParams();
    for (const key of ["q", "role", "period", "status"]) {
      const value = String(data.get(key) ?? "").trim();
      if (value) next.set(key, value);
    }
    startTransition(() => router.replace(`/members${next.size ? `?${next}` : ""}`));
  }

  const role = params.get("role") ?? "";
  const period = params.get("period") ?? "";
  const status = params.get("status") ?? "";

  return (
    <form
      action="/members"
      method="get"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
      className="mb-4 space-y-3 md:flex md:items-center md:gap-3 md:space-y-0"
    >
      <div className="relative md:max-w-md md:flex-1">
        <label htmlFor="member-search" className="sr-only">
          {d.members.searchLabel}
        </label>
        <SearchIcon
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-pmk-muted"
          aria-hidden
        />
        <input
          id="member-search"
          name="q"
          type="search"
          defaultValue={params.get("q") ?? ""}
          placeholder={d.members.searchPlaceholder}
          enterKeyHint="search"
          className="h-[50px] w-full rounded-full border border-pmk-tint-border bg-white pl-12 pr-11 text-base text-pmk-ink placeholder:text-[#84735c] focus-visible:border-pmk-gold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-pmk-gold/20"
        />
        {pending ? (
          <SpinnerIcon
            className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-pmk-muted"
            aria-label={d.common.loading}
          />
        ) : null}
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:mx-0 md:overflow-visible md:px-0 md:pb-0">
        <label className="shrink-0">
          <span className="sr-only">{d.members.filterRole}</span>
          <select
            name="role"
            defaultValue={role}
            onChange={(e) => apply(e.currentTarget.form!)}
            className={chipSelect(!!role)}
          >
            <option value="">{d.members.allRoles}</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="shrink-0">
          <span className="sr-only">{d.members.filterPeriod}</span>
          <select
            name="period"
            defaultValue={period}
            onChange={(e) => apply(e.currentTarget.form!)}
            className={chipSelect(!!period)}
          >
            <option value="">{d.members.allPeriods}</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="shrink-0">
          <span className="sr-only">{d.members.status}</span>
          <select
            name="status"
            defaultValue={status}
            onChange={(e) => apply(e.currentTarget.form!)}
            className={chipSelect(status === "inactive")}
          >
            <option value="">{d.members.statusActive}</option>
            <option value="inactive">{d.members.statusInactive}</option>
          </select>
        </label>
      </div>
      <noscript>
        <button type="submit" className="h-10 px-3 text-sm font-semibold text-pmk-accent">
          {d.common.apply}
        </button>
      </noscript>
    </form>
  );
}
