"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { ErrorIcon, InfoIcon, SpinnerIcon, SuccessIcon, WarningIcon } from "@/components/icons";

// Light-only. Toasts are the prototype's dark pill: deep brown with cream text, springing up.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <SuccessIcon className="size-5 text-[#9fd4b4]" weight="fill" />,
        info: <InfoIcon className="size-5 text-pmk-on-deep-muted" />,
        warning: <WarningIcon className="size-5 text-pmk-gold-line" weight="fill" />,
        error: <ErrorIcon className="size-5 text-[#f2a395]" weight="fill" />,
        loading: <SpinnerIcon className="size-5 animate-spin text-pmk-on-deep-muted" />,
      }}
      style={
        {
          "--normal-bg": "var(--pmk-deep)",
          "--normal-text": "var(--pmk-on-deep)",
          "--normal-border": "transparent",
          "--border-radius": "16px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast !shadow-[var(--pmk-shadow-float)] !font-sans !text-sm !font-medium",
          closeButton: "!bg-pmk-deep !border-pmk-on-deep/20 !text-pmk-on-deep",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
