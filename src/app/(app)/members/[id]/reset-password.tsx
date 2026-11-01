"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { ActionResult } from "@/lib/action-result";
import type { IssuedPassword } from "../actions";

export function ResetPassword({ name, action }: { name: string; action: () => Promise<ActionResult<IssuedPassword>> }) {
  const [issued, setIssued] = useState<IssuedPassword | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (issued) return <OneTimeSecret email={issued.email} secret={issued.temporaryPassword} />;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="h-11 rounded-full px-5">
          <KeyRound aria-hidden /> Reset password
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset password for {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Their current password stops working. You will get a temporary password to share privately, and they must
            choose a new one at next login.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 rounded-full" disabled={pending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="h-11 rounded-full"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const result = await action();
                if (result.ok && result.data) {
                  setIssued(result.data);
                  setOpen(false);
                } else if (!result.ok) {
                  toast.error(result.message);
                }
              });
            }}
          >
            {pending ? "Resetting…" : "Reset password"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
