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
import { ErrorIcon, SpinnerIcon } from "@/components/icons";
import { useDict, useTranslateMessage } from "@/lib/i18n/client";
import type { ActionResult } from "@/lib/action-result";
import { actionClass } from "./surfaces";

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

/** Confirmation sheet for destructive or significant actions (bottom sheet on phones). */
export function ConfirmAction({
  action,
  title,
  description,
  confirmLabel,
  destructive,
  redirectTo,
  blockedReason,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const d = useDict();
  const tr = useTranslateMessage();

  function run(event: React.MouseEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(tr(result.message ?? "Done."));
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
        router.refresh();
      } else {
        toast.error(tr(result.message));
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
            <div>
              {blockedReason ? (
                <p
                  role="alert"
                  data-shake
                  className="flex items-start gap-2.5 rounded-2xl border border-[#ebc3bb] bg-pmk-negative-soft px-4 py-3 text-sm font-medium text-pmk-negative-ink"
                >
                  <ErrorIcon className="mt-px size-5 shrink-0 text-pmk-negative" weight="fill" aria-hidden />
                  <span>{blockedReason}</span>
                </p>
              ) : (
                description
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} className={actionClass("secondary", "h-12")}>
            {blockedReason ? d.common.close : d.common.cancel}
          </AlertDialogCancel>
          {blockedReason ? null : (
            <AlertDialogAction
              onClick={run}
              disabled={pending}
              className={actionClass(destructive ? "danger" : "primary", "h-12")}
            >
              {pending ? (
                <>
                  <SpinnerIcon className="animate-spin" aria-hidden />
                  {d.common.working}
                </>
              ) : (
                confirmLabel
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
