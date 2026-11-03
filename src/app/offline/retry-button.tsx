"use client";

import { actionClass } from "@/components/common/surfaces";

export function RetryButton({ label }: { label: string }) {
  return (
    // A full document load on purpose: this page may be served by the service worker without a
    // working client router, and the retry must go back through the network.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    <button type="button" className={actionClass("primary", "h-12 px-7")} onClick={() => window.location.assign("/")}>
      {label}
    </button>
  );
}
