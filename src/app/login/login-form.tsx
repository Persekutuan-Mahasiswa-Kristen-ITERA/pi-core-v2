"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { loginSchema } from "@/lib/validation";
import { reissueSessionCookies } from "./actions";

const GENERIC_ERROR = "Email or password is incorrect.";

const inputClass =
  "h-12 w-full rounded-xl border border-transparent bg-white pl-12 pr-4 font-[family-name:var(--font-inter)] text-base text-pmk-ink shadow-[4px_4px_4px_rgba(0,0,0,0.25)] outline-none placeholder:text-[#8a8a8a] focus-visible:border-pmk-accent focus-visible:ring-3 focus-visible:ring-pmk-accent/25";

export function LoginForm({ next, inactive }: { next: string; inactive: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    inactive ? "This account is not active. Contact a PMK ITERA admin." : null,
  );

  useEffect(() => {
    // A deactivated account may still hold a session cookie; drop it locally.
    if (inactive) void createClient().auth.signOut({ scope: "local" });
  }, [inactive]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) {
      setError("Enter your email and password.");
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
      setError(authError.status === 429 ? "Too many attempts. Wait a few minutes and try again." : GENERIC_ERROR);
      return;
    }
    await reissueSessionCookies();
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      <div className="relative">
        <label htmlFor="email" className="sr-only">
          Email
        </label>
        <Mail
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#7d7d7d]"
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
          placeholder="email"
          required
          className={inputClass}
        />
      </div>
      <div className="relative">
        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <LockKeyhole
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#7d7d7d]"
          aria-hidden
        />
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="password"
          required
          className={inputClass}
        />
      </div>

      <div aria-live="polite" className="-my-3 min-h-5 text-center text-sm font-medium text-destructive">
        {error}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mx-auto inline-flex h-12 min-w-36 items-center justify-center gap-2 rounded-full bg-pmk-brown px-8 font-[family-name:var(--font-inter)] text-sm text-white shadow-[0_4px_4px_rgba(0,0,0,0.25)] hover:bg-pmk-brown/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pmk-accent disabled:opacity-70"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {pending ? "LOGGING IN…" : "LOG IN"}
      </button>
    </form>
  );
}
