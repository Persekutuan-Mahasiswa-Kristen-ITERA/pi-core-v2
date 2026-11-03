"use client";

import { useFormStatus } from "react-dom";
import { LogoutIcon, SpinnerIcon } from "@/components/icons";
import { signOut } from "@/app/actions/auth";
import { useDict } from "@/lib/i18n/client";
import { actionClass } from "@/components/common/surfaces";
import { cn } from "@/lib/utils";

/**
 * Log out with visible feedback: the button disables itself and says so the moment it is pressed,
 * so it is never pressed twice wondering whether it worked.
 */
export function LogoutButton({
  variant = "row",
  className,
}: {
  variant?: "row" | "block" | "menu";
  className?: string;
}) {
  return (
    <form action={signOut} className={className}>
      <LogoutSubmit variant={variant} />
    </form>
  );
}

function LogoutSubmit({ variant }: { variant: "row" | "block" | "menu" }) {
  const { pending } = useFormStatus();
  const d = useDict();
  const icon = pending ? (
    <SpinnerIcon className="size-5 animate-spin" aria-hidden />
  ) : (
    <LogoutIcon className="size-5" aria-hidden />
  );
  if (variant === "menu") {
    return (
      <button
        type="submit"
        disabled={pending}
        aria-disabled={pending}
        className="pmk-press flex min-h-[60px] w-full items-center gap-3.5 rounded-2xl px-2.5 py-2.5 text-left text-[15px] font-semibold text-pmk-negative hover:bg-pmk-negative-soft focus-visible:outline-2 focus-visible:outline-pmk-accent disabled:cursor-wait"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-pmk-negative-soft">{icon}</span>
        {pending ? d.nav.loggingOut : d.nav.logout}
      </button>
    );
  }
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={cn(
        variant === "row" &&
          "pmk-press inline-flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-pmk-muted hover:bg-pmk-negative-soft hover:text-pmk-negative focus-visible:outline-2 focus-visible:outline-pmk-accent disabled:cursor-wait",
        variant === "block" && actionClass("danger-outline", "h-12 w-full disabled:cursor-wait"),
      )}
    >
      {icon}
      {pending ? d.nav.loggingOut : d.nav.logout}
    </button>
  );
}
