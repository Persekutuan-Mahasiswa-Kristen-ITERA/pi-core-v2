"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="max-w-lg py-10">
      <h1 className="text-[22px] font-semibold text-pmk-ink">Something went wrong</h1>
      <p className="mb-5 mt-2 text-sm text-pmk-muted">
        The data could not be loaded. Check your connection and try again.
        {error.digest ? <span className="mt-1 block text-xs text-pmk-muted">Reference: {error.digest}</span> : null}
      </p>
      <Button className="h-11 rounded-full px-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
