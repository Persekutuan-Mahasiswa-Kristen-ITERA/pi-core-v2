"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * The prototype's segmented control: a dark pill slides behind the current item. With `memoryKey`,
 * the pill starts where it was on the previous screen and slides to the current one, so moving
 * between Anggota, Struktur, Role and Periode reads as one control.
 */
export function SlidingSegment({
  current,
  memoryKey,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { current: number; memoryKey?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    const ind = indRef.current;
    if (!root || !ind) return;
    const items = () => Array.from(root.querySelectorAll<HTMLElement>("[data-seg-item]"));
    const place = (index: number, instant: boolean) => {
      const el = items()[index];
      ind.dataset.instant = String(instant);
      if (!el) {
        ind.style.width = "0px";
        return;
      }
      ind.style.left = `${el.offsetLeft}px`;
      ind.style.width = `${el.offsetWidth}px`;
    };
    let from: number | null = null;
    if (memoryKey) {
      try {
        const v = sessionStorage.getItem(`seg-${memoryKey}`);
        from = v === null || v === "" ? null : Number(v);
        sessionStorage.setItem(`seg-${memoryKey}`, "");
      } catch {
        from = null;
      }
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (from !== null && from !== current && !reduce) {
      place(from, true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => place(current, false)));
      // The observer reports once on start; skip that so the slide is not cut short.
      let started = false;
      const observer = new ResizeObserver(() => {
        if (started) place(current, true);
        started = true;
      });
      observer.observe(root);
      return () => {
        cancelAnimationFrame(id);
        observer.disconnect();
      };
    }
    place(current, true);
    // Re-measure whenever the control or an item changes size: the web font swapping in, a
    // language change, a window resize. Measuring once can leave the pill short of its label.
    const observer = new ResizeObserver(() => place(current, true));
    observer.observe(root);
    items().forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [current, memoryKey]);

  return (
    <div
      ref={ref}
      className={cn("relative isolate grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-[#efe9dd] p-1", className)}
      onClickCapture={() => {
        if (!memoryKey) return;
        try {
          sessionStorage.setItem(`seg-${memoryKey}`, String(current));
        } catch {
          /* storage blocked: the pill simply does not travel */
        }
      }}
      {...props}
    >
      <span
        ref={indRef}
        aria-hidden
        className="pmk-seg-ind absolute inset-y-1 left-0 z-0 w-0 rounded-full bg-pmk-brown"
      />
      {children}
    </div>
  );
}

/** Class for one item of a SlidingSegment (a link or a button). Add `data-seg-item`. */
export const segItemClass = (active: boolean) =>
  cn(
    "relative z-10 grid h-10 place-items-center rounded-full px-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pmk-accent",
    active ? "text-white" : "text-pmk-muted hover:text-pmk-ink",
  );
