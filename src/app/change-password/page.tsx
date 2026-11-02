import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { PasswordForm } from "@/components/common/password-form";
import { signOut } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ChangePasswordPage() {
  const member = await requireMember({ allowPendingPasswordChange: true });
  if (!member.mustChangePassword) redirect("/profile");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-6 pb-[calc(1.5rem+var(--safe-bottom))] pt-[calc(2.5rem+var(--safe-top))]">
      <Image src="/brand/pmk-logo-192.png" alt="PMK ITERA logo" width={56} height={56} />
      <h1 className="mt-6 text-2xl font-semibold tracking-[-0.01em] text-pmk-ink">
        Shalom {member.fullName.split(/\s+/)[0]}!
      </h1>
      <p className="mb-8 mt-1.5 text-sm text-pmk-muted">
        You signed in with a temporary password. Choose your own password to continue.
      </p>
      <div className="rounded-2xl border border-pmk-tint-border p-5">
        <PasswordForm currentLabel="Temporary password" submitLabel="Save password" />
      </div>
      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="min-h-11 text-sm font-medium text-pmk-muted underline-offset-4 hover:text-pmk-ink hover:underline"
        >
          Log out
        </button>
      </form>
    </main>
  );
}
