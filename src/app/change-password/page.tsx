import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { PasswordForm } from "@/components/common/password-form";
import { LanguageSwitch } from "@/components/common/language-switch";
import { signOut } from "@/app/actions/auth";

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getI18n();
  return { title: d.changePassword.title };
}

export default async function ChangePasswordPage() {
  const member = await requireMember({ allowPendingPasswordChange: true });
  if (!member.mustChangePassword) redirect("/profile");
  const { d } = await getI18n();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-[calc(1.5rem+var(--safe-bottom))] pt-[calc(2.5rem+var(--safe-top))]">
      <div className="pmk-enter-down flex items-center justify-between gap-4">
        <span className="grid size-16 place-items-center rounded-full bg-pmk-deep">
          <Image src="/brand/pmk-logo-192.png" alt="" width={44} height={44} />
        </span>
        <LanguageSwitch compact />
      </div>
      <h1 className="pmk-enter-down mt-6 text-[26px] font-extrabold tracking-[-0.02em] text-pmk-ink [animation-delay:80ms]">
        {d.home.greeting(member.fullName.split(/\s+/)[0])}
      </h1>
      <p className="pmk-enter-down mb-6 mt-1.5 text-[15px] text-pmk-muted [animation-delay:140ms]">
        {d.changePassword.body}
      </p>
      <div className="pmk-enter-up-card rounded-[20px] border border-pmk-tint-border bg-white p-5 shadow-[var(--pmk-shadow-card)]">
        <PasswordForm currentLabel={d.changePassword.temporary} submitLabel={d.changePassword.save} />
      </div>
      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="min-h-11 rounded-md text-sm font-semibold text-pmk-muted underline-offset-4 hover:text-pmk-ink hover:underline focus-visible:outline-2 focus-visible:outline-pmk-accent"
        >
          {d.nav.logout}
        </button>
      </form>
    </main>
  );
}
