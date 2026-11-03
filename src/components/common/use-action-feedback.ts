"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslateMessage } from "@/lib/i18n/client";
import type { ActionResult } from "@/lib/action-result";

/** Success toast + navigation after a form's Server Action succeeds. Errors render inline. */
export function useActionFeedback(state: ActionResult<unknown>, redirectTo?: string) {
  const router = useRouter();
  const tr = useTranslateMessage();
  useEffect(() => {
    if (!state.ok) return;
    toast.success(tr(state.message ?? "Saved."));
    if (redirectTo) router.push(redirectTo);
    router.refresh();
    // `tr` only changes with the language; a language switch must not replay the toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, redirectTo, router]);
}
