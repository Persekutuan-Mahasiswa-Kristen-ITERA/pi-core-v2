"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="space-y-3 rounded-xl border-2 border-pmk-gold bg-white p-4" role="status">
      <p className="font-semibold text-pmk-ink">Temporary password for {email}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 select-all break-all rounded-lg bg-pmk-tint px-3 py-2 font-mono text-base text-pmk-ink">
          {secret}
        </code>
        <Button
          type="button"
          variant="outline"
          className="size-11"
          aria-label="Copy temporary password"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(secret);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        </Button>
      </div>
      <p className="text-sm text-pmk-body">
        Share it with the member privately. It is shown only once; they must choose a new password at first login.
      </p>
      {children}
    </div>
  );
}
