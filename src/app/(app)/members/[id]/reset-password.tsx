"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyIcon, SpinnerIcon } from "@/components/icons";
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
import { OneTimeSecret } from "@/components/common/one-time-secret";
import { actionClass } from "@/components/common/surfaces";
import { useDict, useTranslateMessage } from "@/lib/i18n/client";
import type { ActionResult } from "@/lib/action-result";
import type { IssuedPassword } from "../actions";

export function ResetPassword({ name, action }: { name: string; action: () => Promise<ActionResult<IssuedPassword>> }) {
  const [issued, setIssued] = useState<IssuedPassword | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const d = useDict();
  const tr = useTranslateMessage();

  if (issued) return <OneTimeSecret email={issued.email} secret={issued.temporaryPassword} />;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <AlertDialogTrigger asChild>
        <button type="button" className={actionClass("secondary")}>
          <KeyIcon aria-hidden /> {d.members.resetPassword}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{d.members.resetTitle(name)}</AlertDialogTitle>
          <AlertDialogDescription>{d.members.resetBody}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={actionClass("secondary", "h-12")} disabled={pending}>
            {d.common.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            className={actionClass("primary", "h-12")}
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const result = await action();
                if (result.ok && result.data) {
                  setIssued(result.data);
                  setOpen(false);
                } else if (!result.ok) {
                  toast.error(tr(result.message));
                }
              });
            }}
          >
            {pending ? (
              <>
                <SpinnerIcon className="animate-spin" aria-hidden />
                {d.members.resetting}
              </>
            ) : (
              d.members.resetPassword
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
