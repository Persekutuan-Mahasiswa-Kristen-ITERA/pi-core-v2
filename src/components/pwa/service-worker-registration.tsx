"use client";

import { useEffect } from "react";

/** Registers /sw.js in production builds only (dev reloads would fight the cache). */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Installability degrades gracefully; the app works without a service worker.
    });
  }, []);
  return null;
}
