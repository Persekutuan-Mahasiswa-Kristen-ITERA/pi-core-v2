"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { loginSchema } from "@/lib/validation";
import { reissueSessionCookies } from "./actions";

const GENERIC_ERROR = "Email or password is incorrect.";

const inputClass =
  "h-12 w-full rounded-[10px] border border-pmk-control bg-white pl-11 pr-4 text-base text-pmk-ink outline-none transition-colors placeholder:text-pmk-muted hover:border-pmk-muted/60 focus-visible:border-pmk-accent focus-visible:ring-3 focus-visible:ring-pmk-accent/15";

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
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-pmk-ink">
          Email
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-pmk-muted"
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
            placeholder="name@student.itera.ac.id"
            required
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-pmk-ink">
          Password
        </label>
        <div className="relative">
          <LockKeyhole
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-pmk-muted"
            aria-hidden
          />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            required
            className={inputClass}
          />
        </div>
      </div>

      <div aria-live="polite" className="min-h-5 text-sm font-medium text-destructive">
        {error}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-pmk-brown px-8 text-sm font-semibold text-white transition-colors hover:bg-pmk-brown-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pmk-accent disabled:cursor-wait disabled:opacity-80"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
