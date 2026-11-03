"use client";

import { useFormStatus } from "react-dom";
import { ErrorIcon, SpinnerIcon } from "@/components/icons";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/common/field-error";
import { useDict, useTranslateMessage } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { actionClass } from "./surfaces";

export function SubmitButton({
  children,
  pendingText,
  className,
  disabled,
  ...props
}: React.ComponentProps<"button"> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  const d = useDict();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-disabled={pending}
      className={actionClass("primary", cn("h-12 px-7 disabled:cursor-wait disabled:opacity-80", className))}
      {...props}
    >
      {pending ? (
        <>
          <SpinnerIcon className="animate-spin" aria-hidden />
          {pendingText ?? d.common.saving}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Text inputs and selects: 50px tall, 14px radius, a warm edge at 3:1, gold focus ring. 16px text so
 * iOS does not zoom into the field.
 */
export const fieldClass =
  "h-[50px] w-full rounded-[14px] border border-pmk-control bg-white px-4 text-base text-pmk-ink placeholder:text-[#84735c] transition-[border-color,box-shadow] hover:border-pmk-muted focus-visible:border-pmk-gold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-pmk-gold/20 disabled:bg-pmk-tint disabled:text-pmk-muted aria-invalid:border-pmk-negative aria-invalid:ring-3 aria-invalid:ring-pmk-negative/12";

/** Native selects keep the platform picker; only the chevron is drawn. */
export const selectClass = cn(fieldClass, "pmk-chevron appearance-none pr-11");

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
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-semibold text-pmk-ink">
        {label}
      </Label>
      {children({ id, name, "aria-invalid": errors?.length ? true : undefined, "aria-describedby": describedBy })}
      {hint ? (
        <p id={hintId} className="text-[13px] text-pmk-muted">
          {hint}
        </p>
      ) : null}
      <FieldError id={errorId} messages={errors} />
    </div>
  );
}

/** Form-level error: a red banner that shakes in (MotionObserver), in the viewer's language. */
export function FormMessage({ state }: { state: { ok: boolean; message?: string } }) {
  const tr = useTranslateMessage();
  if (!state.message || state.ok) return null;
  return (
    <p
      role="alert"
      data-shake
      className="flex items-start gap-2.5 rounded-2xl border border-[#ebc3bb] bg-pmk-negative-soft px-4 py-3 text-sm font-medium text-pmk-negative-ink"
    >
      <ErrorIcon className="mt-px size-5 shrink-0 text-pmk-negative" weight="fill" aria-hidden />
      <span>{tr(state.message)}</span>
    </p>
  );
}

/** An informational banner inside a form or a sheet. `pulse` gives it the prototype's breathing edge. */
export function InfoBanner({
  icon,
  pulse = false,
  className,
  children,
}: {
  icon?: React.ReactNode;
  pulse?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-2xl border border-pmk-tint-border bg-pmk-tint px-4 py-3 text-sm text-pmk-body",
        pulse && "pmk-banner-pulse",
        className,
      )}
    >
      {icon ? <span className="mt-px shrink-0 text-pmk-muted [&_svg]:size-5">{icon}</span> : null}
      <span>{children}</span>
    </div>
  );
}

/** A form laid out as a white card with its fields and the actions at the bottom. */
export function FormCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-pmk-tint-border bg-white p-5 shadow-[var(--pmk-shadow-card)] sm:p-6",
        className,
      )}
      {...props}
    />
  );
}

/** Secondary text action beside the submit button ("Cancel"). */
export const cancelLinkClass = actionClass("secondary", "h-12");

/** A choice drawn as a card (Mahasiswa / Dosen); the native radio stays for keyboard and screen readers. */
export const choiceCardClass =
  "pmk-press flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border border-pmk-tint-border bg-white px-4 py-3 hover:bg-pmk-tint has-checked:border-pmk-ink has-checked:bg-pmk-gold-soft has-checked:shadow-[inset_0_0_0_0.5px_var(--pmk-ink)] has-focus-visible:outline-2 has-focus-visible:outline-pmk-accent";
