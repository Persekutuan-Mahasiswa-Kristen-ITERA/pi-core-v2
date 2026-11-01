"use client";

import { useFormStatus } from "react-dom";
import { Loader2, LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

/**
 * Log out with visible feedback: the button disables itself and says "Logging out…" the moment it
 * is pressed, so it is never pressed twice wondering whether it worked.
 */
export function LogoutButton({ variant = "row", className }: { variant?: "row" | "block"; className?: string }) {
  return (
    <form action={signOut} className={className}>
      <LogoutSubmit variant={variant} />
    </form>
  );
}

function LogoutSubmit({ variant }: { variant: "row" | "block" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={cn(
        "inline-flex items-center gap-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pmk-accent disabled:cursor-wait",
        variant === "row" &&
          "min-h-10 w-full rounded-lg px-2.5 text-pmk-body hover:bg-pmk-active hover:text-pmk-ink disabled:bg-pmk-active",
        variant === "block" &&
          "h-11 w-full justify-center rounded-full border border-pmk-control bg-white text-pmk-ink hover:bg-pmk-tint disabled:bg-pmk-tint",
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogOut className="size-4" aria-hidden />}
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
