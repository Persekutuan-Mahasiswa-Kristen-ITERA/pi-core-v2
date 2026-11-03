"use client";

import { useEffect } from "react";
import { ErrorIcon } from "@/components/icons";
import { actionClass } from "@/components/common/surfaces";
import { useDict } from "@/lib/i18n/client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const d = useDict();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div
      role="alert"
      className="max-w-lg rounded-[20px] border border-[#ebc3bb] bg-pmk-negative-soft p-6 text-pmk-negative-ink"
    >
      <ErrorIcon className="size-8 text-pmk-negative" weight="fill" aria-hidden />
      <h1 className="mt-3 text-[22px] font-extrabold tracking-[-0.01em]">{d.states.errorTitle}</h1>
      <p className="mb-5 mt-2 text-sm">
        {d.states.errorBody}
        {error.digest ? (
          <span className="mt-1 block text-xs opacity-80">{d.states.reference(error.digest)}</span>
        ) : null}
      </p>
      <button type="button" className={actionClass("secondary")} onClick={reset}>
        {d.common.tryAgain}
      </button>
    </div>
  );
}
