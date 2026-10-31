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
      <Image src="/brand/pmk-logo.png" alt="PMK ITERA logo" width={72} height={72} unoptimized className="mx-auto" />
      <h1 className="mt-6 text-center text-2xl font-bold text-pmk-ink">Shalom, {member.fullName}!</h1>
      <p className="mb-8 mt-2 text-center text-sm text-pmk-body">
        You signed in with a temporary password. Choose your own password to continue.
      </p>
      <PasswordForm currentLabel="Temporary password" submitLabel="Save password" />
      <form action={signOut} className="mt-6 text-center">
        <button type="submit" className="min-h-11 text-sm font-medium text-pmk-accent underline-offset-4 hover:underline">
          Log out
        </button>
      </form>
    </main>
  );
}
