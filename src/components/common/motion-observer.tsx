"use client";

import { useEffect } from "react";

/**
 * Stitch motion that follows state rather than markup: a field marked invalid shakes, and an error
 * banner shakes when it appears. One observer for the whole app, so no form has to remember it.
 * Under reduced motion the CSS keeps the shake to a single 0.01ms frame.
 */
export function MotionObserver() {
  useEffect(() => {
    const shake = (el: Element) => {
      el.classList.remove("pmk-shake");
      void (el as HTMLElement).offsetWidth;
      el.classList.add("pmk-shake");
      el.addEventListener("animationend", () => el.classList.remove("pmk-shake"), { once: true });
    };
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        const t = r.target as Element;
        if (
          r.type === "attributes" &&
          r.attributeName === "aria-invalid" &&
          t.getAttribute("aria-invalid") === "true"
        ) {
          shake(t);
        }
        if (r.type === "childList") {
          r.addedNodes.forEach((n) => {
            if (n instanceof Element && n.matches('[role="alert"][data-shake]')) shake(n);
          });
        }
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-invalid"],
    });
    return () => observer.disconnect();
  }, []);
  return null;
}
