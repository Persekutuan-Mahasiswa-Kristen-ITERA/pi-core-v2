"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorIcon, EyeIcon, EyeOffIcon, InfoIcon, LockIcon, MailIcon, SpinnerIcon } from "@/components/icons";
import { actionClass } from "@/components/common/surfaces";
import { createClient } from "@/lib/supabase/browser";
import { useDict } from "@/lib/i18n/client";
import { loginSchema } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { reissueSessionCookies } from "./actions";

type ErrorKey = "generic" | "tooMany" | "enterBoth" | "inactive";

const inputClass =
  "h-[52px] w-full rounded-[14px] border border-pmk-control bg-white pl-12 pr-4 text-base text-pmk-ink outline-none transition-[border-color,box-shadow] placeholder:text-[#84735c] hover:border-pmk-muted focus-visible:border-pmk-gold focus-visible:ring-3 focus-visible:ring-pmk-gold/20 aria-invalid:border-pmk-negative";

export function LoginForm({ next, inactive }: { next: string; inactive: boolean }) {
  const router = useRouter();
  const d = useDict();
  const [pending, setPending] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [forgot, setForgot] = useState(false);
  // The key, not the text, so a language switch re-renders the message in the new language.
  const [error, setError] = useState<ErrorKey | null>(inactive ? "inactive" : null);

  useEffect(() => {
    // A deactivated account may still hold a session cookie; drop it locally.
    if (inactive) void createClient().auth.signOut({ scope: "local" });
  }, [inactive]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) {
      setError("enterBoth");
      return;
    }
    setPending(true);
    setError(null);
    // Sign-in runs in the browser so Supabase Auth rate-limits by the member's own IP address.
    const { error: authError } = await createClient().auth.signInWithPassword(parsed.data);
    if (authError) {
      setPending(false);
      // One message for unknown email, wrong password and banned (deactivated) accounts, so the
      // form cannot be used to discover which emails exist.
      setError(authError.status === 429 ? "tooMany" : "generic");
      return;
    }
    await reissueSessionCookies();
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error ? (
        <p
          role="alert"
          data-shake
          key={error}
          className="flex items-start gap-2.5 rounded-2xl border border-[#ebc3bb] bg-pmk-negative-soft px-4 py-3 text-sm font-medium text-pmk-negative-ink"
        >
          <ErrorIcon className="mt-px size-5 shrink-0 text-pmk-negative" weight="fill" aria-hidden />
          <span>{d.login[error]}</span>
        </p>
      ) : null}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-pmk-ink">
          {d.login.email}
        </label>
        <div className="relative">
          <MailIcon
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-pmk-muted"
            aria-hidden
          />
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={d.login.emailPlaceholder}
            required
            aria-invalid={error === "enterBoth" || error === "generic" ? true : undefined}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label htmlFor="password" className="block text-sm font-semibold text-pmk-ink">
            {d.login.password}
          </label>
          <button
            type="button"
            onClick={() => setForgot((v) => !v)}
            aria-expanded={forgot}
            aria-controls="forgot-note"
            className="rounded-md py-1 text-sm font-semibold text-pmk-gold-strong hover:underline focus-visible:outline-2 focus-visible:outline-pmk-accent"
          >
            {d.login.forgot}
          </button>
        </div>
        <div className="relative">
          <LockIcon
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-pmk-muted"
            aria-hidden
          />
          <input
            id="password"
            name="password"
            type={reveal ? "text" : "password"}
            autoComplete="current-password"
            placeholder={d.login.passwordPlaceholder}
            required
            aria-invalid={error === "enterBoth" || error === "generic" ? true : undefined}
            className={cn(inputClass, "pr-14")}
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-pressed={reveal}
            aria-label={reveal ? d.login.conceal : d.login.reveal}
            className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-pmk-muted hover:bg-pmk-tint hover:text-pmk-ink focus-visible:outline-2 focus-visible:outline-pmk-accent"
          >
            {reveal ? <EyeOffIcon className="size-5" aria-hidden /> : <EyeIcon className="size-5" aria-hidden />}
          </button>
        </div>
      </div>
      {forgot ? (
        <p
          id="forgot-note"
          className="flex items-start gap-2.5 rounded-2xl border border-pmk-tint-border bg-pmk-tint px-4 py-3 text-sm text-pmk-body"
        >
          <InfoIcon className="mt-px size-5 shrink-0 text-pmk-muted" aria-hidden />
          <span>{d.login.forgotNote}</span>
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={actionClass(
          "primary",
          "pmk-shimmer-button mt-1 h-[52px] w-full bg-pmk-deep text-base hover:bg-[#2c1e0d] disabled:cursor-wait",
        )}
      >
        {pending ? <SpinnerIcon className="animate-spin" aria-hidden /> : null}
        {pending ? d.login.submitting : d.login.submit}
      </button>
    </form>
  );
}
