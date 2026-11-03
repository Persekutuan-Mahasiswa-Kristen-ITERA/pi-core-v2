"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/lib/i18n/actions";
import { useDict, useLocale } from "@/lib/i18n/client";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { SlidingSegment, segItemClass } from "./sliding-segment";

/**
 * The single control that switches PI-CORE's language (Indonesia | English). The choice is kept in a
 * cookie for this device; the server re-renders the current screen in the new language.
 */
export function LanguageSwitch({ className, compact = false }: { className?: string; compact?: boolean }) {
  const locale = useLocale();
  const d = useDict();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {compact ? null : <p className="text-sm font-semibold text-pmk-ink">{d.language.label}</p>}
      <SlidingSegment
        current={LOCALES.indexOf(locale)}
        role="group"
        aria-label={d.language.label}
        aria-busy={pending}
        className={cn(compact && "inline-grid", pending && "opacity-70")}
      >
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            data-seg-item
            lang={l}
            aria-pressed={l === locale}
            onClick={() => choose(l)}
            className={cn(segItemClass(l === locale), compact && "h-9 px-4 text-[13px]")}
          >
            {d.language[l]}
          </button>
        ))}
      </SlidingSegment>
      {compact ? null : <p className="text-[13px] text-pmk-muted">{d.language.hint}</p>}
    </div>
  );
}
