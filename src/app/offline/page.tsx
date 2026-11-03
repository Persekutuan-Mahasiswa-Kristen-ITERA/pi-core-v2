import type { Metadata } from "next";
import Image from "next/image";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";
import { LOCALES, LOCALE_COOKIE } from "@/lib/i18n/config";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = { title: "Offline" };
// Precached by the service worker, so it must not depend on a session or on data.
export const dynamic = "force-static";

/*
 * Both languages are in the static HTML; a two-line inline script reads the language cookie and
 * hides the other one. Inline on purpose: when this page is served offline, the app's JavaScript
 * chunks may not be in the cache, but an inline script always runs. Without script, Indonesian shows.
 */
const PICK_LANGUAGE = `(function(){try{var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=(id|en)/);var l=m?m[1]:"id";document.documentElement.lang=l;document.documentElement.setAttribute("data-offline-lang",l);}catch(e){}})();`;

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 pb-[var(--safe-bottom)] pt-[var(--safe-top)] text-center">
      <script dangerouslySetInnerHTML={{ __html: PICK_LANGUAGE }} />
      <span className="grid size-24 place-items-center rounded-full bg-pmk-deep">
        <Image src="/brand/pmk-logo-192.png" alt="" width={64} height={64} priority />
      </span>
      {LOCALES.map((locale) => {
        const d = DICTIONARIES[locale];
        return (
          <div key={locale} lang={locale} data-offline-text={locale} className="flex flex-col items-center gap-5">
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-pmk-ink">{d.states.offlineTitle}</h1>
            <p className="max-w-xs text-[15px] text-pmk-muted">{d.states.offlineBody}</p>
            <RetryButton label={d.common.tryAgain} />
          </div>
        );
      })}
    </main>
  );
}
