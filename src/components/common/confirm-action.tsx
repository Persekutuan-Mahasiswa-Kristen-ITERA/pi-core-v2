"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ActionResult } from "@/lib/action-result";

type Props = {
  /** A Server Action already bound to its target id. */
  action: () => Promise<ActionResult<unknown>>;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  redirectTo?: string;
  /** When set, the dialog explains why the action is unavailable and offers no confirm button. */
  blockedReason?: React.ReactNode;
  children: React.ReactNode; // the trigger
};

/** Confirmation dialog for destructive or significant actions. */
export function ConfirmAction({ action, title, description, confirmLabel, destructive, redirectTo, blockedReason, children }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(event: React.MouseEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message ?? "Done.");
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-pmk-body">{blockedReason ?? description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} className="h-11 rounded-full">
            {blockedReason ? "Close" : "Cancel"}
          </AlertDialogCancel>
          {blockedReason ? null : (
          <AlertDialogAction
            onClick={run}
            disabled={pending}
            className={
              destructive
                ? "h-11 rounded-full bg-destructive text-white hover:bg-destructive/90"
                : "h-11 rounded-full"
            }
          >
            {pending ? "Working…" : confirmLabel}
          </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
