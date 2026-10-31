"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <p className="text-lg font-bold text-pmk-ink">Something went wrong</p>
      <p className="max-w-sm text-sm text-pmk-body">
        The data could not be loaded. Check your connection and try again.
        {error.digest ? <span className="mt-1 block text-xs text-pmk-muted">Reference: {error.digest}</span> : null}
      </p>
      <Button className="h-11 rounded-full px-8" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
