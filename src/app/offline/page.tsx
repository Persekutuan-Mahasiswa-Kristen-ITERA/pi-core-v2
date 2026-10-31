import type { Metadata } from "next";
import Image from "next/image";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = { title: "Offline" };
// Precached by the service worker, so it must not depend on a session or on data.
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 pb-[var(--safe-bottom)] pt-[var(--safe-top)] text-center">
      <Image src="/brand/pmk-logo.png" alt="PMK ITERA logo" width={96} height={96} unoptimized priority />
      <h1 className="text-xl font-bold text-pmk-ink">You are offline</h1>
      <p className="max-w-xs text-sm text-pmk-body">
        PI-CORE needs a connection to show member data. Nothing is stored on this device, so reconnect and try again.
      </p>
      <RetryButton />
    </main>
  );
}
