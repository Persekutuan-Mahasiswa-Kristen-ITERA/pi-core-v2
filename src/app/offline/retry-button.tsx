"use client";

import { Button } from "@/components/ui/button";

export function RetryButton() {
  return (
    // A full document load on purpose: this page may be served by the service worker without a
    // working client router, and the retry must go back through the network.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    <Button className="h-11 rounded-full px-6" onClick={() => window.location.assign("/")}>
      Try again
    </Button>
  );
}
