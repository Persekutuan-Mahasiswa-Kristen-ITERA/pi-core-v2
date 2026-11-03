"use client";

import { useTranslateMessage } from "@/lib/i18n/client";

/** First validation message of a field, in the viewer's language. */
export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  const tr = useTranslateMessage();
  if (!messages?.length) return null;
  return (
    <p id={id} className="text-[13px] font-semibold text-pmk-negative">
      {tr(messages[0])}
    </p>
  );
}
