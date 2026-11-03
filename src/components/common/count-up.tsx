"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/config";

/**
 * A figure that counts up from 0 on arrival (easeOutQuad, 1.2s), as on the Stitch dashboard. The
 * final value is rendered on the server and stays for screen readers, no-JS and reduced motion.
 */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const locale = useLocale();

  useEffect(() => {
    const el = ref.current;
    if (!el || value <= 0) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const fmt = new Intl.NumberFormat(INTL_LOCALE[locale]);
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min((now - start) / 1200, 1);
      el.textContent = fmt.format(p < 1 ? Math.floor((1 - (1 - p) * (1 - p)) * value) : value);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, locale]);

  return (
    <span ref={ref} className="tnum">
      {new Intl.NumberFormat(INTL_LOCALE[locale]).format(value)}
    </span>
  );
}
