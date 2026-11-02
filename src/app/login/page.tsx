import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionState } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeRedirectPath(typeof params.next === "string" ? params.next : null);
  const reason = typeof params.reason === "string" ? params.reason : null;

  const state = await getSessionState();
  if (state.status === "member" && reason !== "inactive") redirect(next);

  return (
    <div className="flex min-h-dvh flex-col bg-white lg:flex-row">
      {/* Brand field: the PMK brown, the seal and the name. Top band on phones, left half on desktop. */}
      <section
        aria-label="PMK ITERA"
        className="flex flex-col justify-end bg-pmk-brown px-6 pb-8 pt-[calc(3rem+var(--safe-top))] text-white lg:w-[46%] lg:justify-between lg:p-14"
      >
        <Image
          src="/brand/pmk-logo-192.png"
          alt="PMK ITERA logo"
          width={72}
          height={72}
          priority
          className="lg:size-24"
        />
        <div className="mt-8 lg:mt-0">
          <p className="text-[28px] font-semibold leading-tight tracking-[-0.015em] lg:text-[40px]">PI-CORE</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/80 lg:text-base">
            Members, structure and kepengurusan of Persekutuan Mahasiswa Kristen, Institut Teknologi Sumatera.
          </p>
        </div>
      </section>

      <main className="flex flex-1 flex-col px-6 pb-[calc(1.5rem+var(--safe-bottom))] pt-10 lg:items-center lg:justify-center lg:px-14">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-pmk-ink">Log in</h1>
          <p className="mb-8 mt-1.5 text-sm text-pmk-muted">Use the email and password your PMK admin gave you.</p>
          <LoginForm next={next} inactive={reason === "inactive"} />
          <p className="mt-10 text-sm text-pmk-muted">Google sign-in comes in a later version.</p>
        </div>
      </main>
    </div>
  );
}
