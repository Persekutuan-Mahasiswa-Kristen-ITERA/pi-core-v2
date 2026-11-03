import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionState } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { LanguageSwitch } from "@/components/common/language-switch";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.login.title };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeRedirectPath(typeof params.next === "string" ? params.next : null);
  const reason = typeof params.reason === "string" ? params.reason : null;

  const state = await getSessionState();
  if (state.status === "member" && reason !== "inactive") redirect(next);
  const { d } = await getI18n();

  return (
    <div className="flex min-h-dvh flex-col bg-pmk-cream lg:flex-row">
      {/* Brand band: deep brown with drifting gold light, the seal breathing. Top on phones, left half on desktop. */}
      <section
        aria-label="PMK ITERA"
        className="relative isolate flex flex-col items-center justify-center gap-2.5 overflow-hidden bg-pmk-deep px-6 pb-16 pt-[calc(3rem+var(--safe-top))] text-center text-pmk-on-deep lg:w-[46%] lg:p-12"
      >
        <span aria-hidden className="pmk-glow -left-16 -top-24 size-72 bg-[rgba(230,198,92,0.26)]" />
        <span aria-hidden className="pmk-glow pmk-glow-2 -right-28 top-8 size-80 bg-[rgba(160,120,70,0.3)]" />
        <span className="pmk-breathe relative z-[1] mb-1.5 grid size-[88px] place-items-center rounded-full border border-[rgba(230,198,92,0.45)] bg-[rgba(251,245,228,0.08)] lg:size-28">
          <Image src="/brand/pmk-logo-192.png" alt="" width={64} height={64} priority className="lg:size-20" />
        </span>
        <p className="pmk-enter-down relative z-[1] text-[32px] font-extrabold tracking-[-0.02em] [animation-delay:80ms] lg:text-[44px]">
          PMK ITERA
        </p>
        <p className="pmk-enter-down relative z-[1] text-[15px] text-pmk-on-deep-muted [animation-delay:160ms] lg:text-[17px]">
          {d.login.tagline}
        </p>
        <p className="pmk-enter-down relative z-[1] mt-3 hidden max-w-sm text-sm leading-relaxed text-pmk-on-deep-muted [animation-delay:240ms] lg:block">
          {d.login.brandLine}
        </p>
      </section>

      <main className="pmk-enter-up-card relative -mt-7 flex flex-1 flex-col rounded-t-[28px] bg-pmk-cream px-6 pb-[calc(2rem+var(--safe-bottom))] pt-8 lg:mt-0 lg:items-center lg:justify-center lg:rounded-none lg:px-14">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-6 flex justify-end">
            <LanguageSwitch compact />
          </div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-pmk-ink">{d.login.heading}</h1>
          <p className="mb-6 mt-1 text-[15px] text-pmk-muted">{d.login.lead}</p>
          <LoginForm next={next} inactive={reason === "inactive"} />
          <div className="my-5 flex items-center gap-3 text-[13px] text-pmk-muted before:h-px before:flex-1 before:bg-pmk-tint-border after:h-px after:flex-1 after:bg-pmk-tint-border">
            {d.login.or}
          </div>
          {/* Not a button: Google sign-in is not built yet, so nothing here can be pressed. */}
          <div
            aria-disabled="true"
            className="flex h-12 items-center justify-between gap-3 rounded-full border-[1.5px] border-pmk-tint-border bg-white px-5 text-[15px] font-semibold text-pmk-muted"
          >
            <span className="flex items-center gap-2.5">
              <svg viewBox="0 0 24 24" aria-hidden className="size-5">
                <path
                  fill="#4285F4"
                  d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
                />
                <path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14Z" />
                <path
                  fill="#EA4335"
                  d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6Z"
                />
              </svg>
              {d.login.google}
            </span>
            <span className="pmk-soft-pulse rounded-full border border-pmk-tint-border bg-pmk-tint px-2.5 py-0.5 text-xs font-semibold">
              {d.login.soon}
            </span>
          </div>
          <p className="mt-8 text-center text-[13px] text-pmk-muted">{d.login.footer}</p>
        </div>
      </main>
    </div>
  );
}
