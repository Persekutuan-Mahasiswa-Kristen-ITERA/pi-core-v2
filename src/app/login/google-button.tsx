"use client";

import { useState } from "react";
import { SpinnerIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/browser";
import { useDict } from "@/lib/i18n/client";

/**
 * "Log in with Google" (D-13). Starts the OAuth flow in the browser; the PKCE verifier is kept in a
 * cookie by the Supabase browser client and /auth/callback finishes the sign-in on the server.
 * Google is only a second way into an account an admin created: sign-up stays closed.
 */
export function GoogleButton({ next }: { next: string }) {
  const d = useDict();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onClick() {
    setPending(true);
    setFailed(false);
    const redirectTo = new URL("/auth/callback", window.location.origin);
    if (next !== "/") redirectTo.searchParams.set("next", next);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString(), queryParams: { prompt: "select_account" } },
    });
    // On success the browser is already navigating to Google; only a failure lands here.
    if (error) {
      setPending(false);
      setFailed(true);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-busy={pending || undefined}
        className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border-[1.5px] border-pmk-tint-border bg-white px-5 text-[15px] font-semibold text-pmk-ink transition-[border-color,background-color] hover:border-pmk-muted hover:bg-pmk-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pmk-accent disabled:cursor-progress disabled:opacity-70"
      >
        {pending ? (
          <SpinnerIcon className="size-5 animate-spin" aria-hidden />
        ) : (
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
            <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6Z" />
          </svg>
        )}
        {pending ? d.login.googleRedirecting : d.login.google}
      </button>
      {failed ? (
        <p role="alert" className="mt-2 text-center text-[13px] font-medium text-pmk-negative-ink">
          {d.login.googleFailed}
        </p>
      ) : (
        <p className="mt-2 text-center text-[13px] leading-relaxed text-pmk-muted">{d.login.googleHint}</p>
      )}
    </div>
  );
}
