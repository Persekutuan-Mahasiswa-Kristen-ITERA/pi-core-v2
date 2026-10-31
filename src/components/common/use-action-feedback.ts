"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";

/** Success toast + navigation after a form's Server Action succeeds. Errors render inline. */
export function useActionFeedback(state: ActionResult<unknown>, redirectTo?: string) {
  const router = useRouter();
  useEffect(() => {
    if (!state.ok) return;
    toast.success(state.message ?? "Saved.");
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }, [state, redirectTo, router]);
}
