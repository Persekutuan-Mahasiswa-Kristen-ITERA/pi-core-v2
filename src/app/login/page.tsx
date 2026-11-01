import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionState } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { APP_NAME } from "@/lib/app-config";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeRedirectPath(typeof params.next === "string" ? params.next : null);
  const reason = typeof params.reason === "string" ? params.reason : null;

  const state = await getSessionState();
  if (state.status === "member" && reason !== "inactive") redirect(next);

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="relative flex min-h-[299px] flex-col items-center justify-center gap-5 rounded-bl-[124px] bg-pmk-brown/90 px-8 pb-10 pt-[calc(2.5rem+var(--safe-top))] text-center shadow-[1px_7px_8px_5px_rgba(110,57,16,0.25),inset_29px_7px_20px_-7px_rgba(0,0,0,0.25)]">
        <Image src="/brand/pmk-logo.png" alt="PMK ITERA logo" width={88} height={88} priority unoptimized />
        <p className="max-w-[18rem] font-display text-xl uppercase leading-snug tracking-[1.4px] text-white">
          {APP_NAME}
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-8 pb-[calc(1.5rem+var(--safe-bottom))] pt-12">
        <h1 className="mb-10 text-center font-display text-2xl tracking-[5.76px] text-[#2a1e09] [text-shadow:0_2px_3px_rgba(0,0,0,0.2)]">
          LOGIN
        </h1>
        <LoginForm next={next} inactive={reason === "inactive"} />
        <p className="mt-auto pt-12 text-center text-xs text-pmk-muted">
          Log in with Google <span className="whitespace-nowrap">— coming in a later version</span>
        </p>
      </main>
    </div>
  );
}
