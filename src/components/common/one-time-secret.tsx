"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, LockIcon, SuccessIcon } from "@/components/icons";
import { useDict } from "@/lib/i18n/client";
import { actionClass } from "./surfaces";

/** Shows a temporary password once. It is not stored anywhere after this screen. */
export function OneTimeSecret({
  email,
  secret,
  children,
}: {
  email: string;
  secret: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const d = useDict();
  return (
    <div className="space-y-4" role="status">
      <div className="flex items-start gap-3">
        <SuccessIcon className="size-7 shrink-0 text-pmk-positive" weight="fill" aria-hidden />
        <p className="pt-0.5 font-bold text-pmk-ink">{d.secret.title(email)}</p>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-dashed border-[#cdbf9f] bg-pmk-tint px-4 py-3.5">
        <code className="min-w-0 select-all break-all font-mono text-xl font-bold tracking-[0.06em] text-pmk-ink">
          {secret}
        </code>
        <button
          type="button"
          className={actionClass("secondary", "h-11 px-4")}
          aria-label={d.secret.copy}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(secret);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
          <span aria-hidden>{copied ? d.secret.copied : null}</span>
        </button>
      </div>
      <p className="flex items-start gap-2.5 rounded-2xl border border-pmk-tint-border bg-pmk-tint px-4 py-3 text-sm text-pmk-body">
        <LockIcon className="mt-px size-5 shrink-0 text-pmk-muted" aria-hidden />
        <span>{d.secret.body}</span>
      </p>
      {children}
    </div>
  );
}
