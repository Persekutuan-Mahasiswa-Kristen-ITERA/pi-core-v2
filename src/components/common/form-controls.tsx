"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/common/states";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  pendingText,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      aria-disabled={pending}
      className={cn(
        "h-11 rounded-full bg-pmk-brown px-6 text-sm font-semibold text-white hover:bg-pmk-brown-hover disabled:opacity-80",
        className,
      )}
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

/** Text inputs and selects. 16px text on phones so iOS does not zoom into the field. */
export const fieldClass =
  "h-11 w-full rounded-[10px] border border-pmk-control bg-white px-3.5 text-base text-pmk-ink placeholder:text-pmk-muted transition-colors hover:border-pmk-muted/60 focus-visible:border-pmk-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-pmk-accent/15 disabled:bg-pmk-tint aria-invalid:border-destructive sm:h-10 sm:text-sm";

type FieldProps = {
  name: string;
  label: string;
  errors?: string[];
  hint?: string;
  children: (a11y: {
    id: string;
    name: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }) => React.ReactNode;
};

/** Label + control + hint + error, with the aria wiring done once. */
export function Field({ name, label, errors, hint, children }: FieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [errors?.length ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-pmk-ink">
        {label}
      </Label>
      {children({ id, name, "aria-invalid": errors?.length ? true : undefined, "aria-describedby": describedBy })}
      {hint ? (
        <p id={hintId} className="text-xs text-pmk-muted">
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
    <p role="alert" className="rounded-[10px] bg-[#ffedea] px-4 py-3 text-sm font-medium text-[#831c1e]">
      {state.message}
    </p>
  );
}

/** A form laid out as a white card with its fields and the actions at the bottom. */
export function FormCard({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-pmk-tint-border bg-white p-5 sm:p-6", className)} {...props} />;
}

/** Secondary text action beside the submit button ("Cancel"). */
export const cancelLinkClass =
  "inline-flex h-11 items-center rounded-full px-4 text-sm font-medium text-pmk-muted hover:bg-pmk-tint hover:text-pmk-ink";
