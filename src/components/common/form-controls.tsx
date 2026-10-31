"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/common/states";
import { cn } from "@/lib/utils";

export function SubmitButton({ children, pendingText, className, ...props }: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      aria-disabled={pending}
      className={cn("h-11 rounded-full px-8 text-sm font-semibold shadow-[0_4px_4px_rgba(0,0,0,0.25)]", className)}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {pendingText ?? "Saving…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export const fieldClass =
  "h-11 w-full rounded-xl border-2 border-pmk-tint-border bg-pmk-tint px-4 text-base text-pmk-ink placeholder:text-pmk-muted focus-visible:border-pmk-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-pmk-accent/20 aria-invalid:border-destructive sm:text-sm";

type FieldProps = {
  name: string;
  label: string;
  errors?: string[];
  hint?: string;
  children: (a11y: { id: string; name: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => React.ReactNode;
};

/** Label + control + hint + error, with the aria wiring done once. */
export function Field({ name, label, errors, hint, children }: FieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [errors?.length ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-semibold text-pmk-ink">
        {label}
      </Label>
      {children({ id, name, "aria-invalid": errors?.length ? true : undefined, "aria-describedby": describedBy })}
      {hint ? (
        <p id={hintId} className="text-xs text-pmk-body">
          {hint}
        </p>
      ) : null}
      <FieldError id={errorId} messages={errors} />
    </div>
  );
}

export function FormMessage({ state }: { state: { ok: boolean; message?: string } }) {
  if (!state.message || state.ok) return null;
  return (
    <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
      {state.message}
    </p>
  );
}
