"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, type LucideIcon } from "lucide-react";
import { useT } from "@/lib/i18n";

/**
 * Destructive action with an inline second step instead of window.confirm.
 * Focus moves to "Cancel" when the confirmation opens, and back to the trigger
 * when it closes, so a stray Enter never confirms.
 */
export function ConfirmAction({
  title,
  body,
  confirmText,
  confirmLabel,
  Icon,
  onConfirm,
  done,
}: {
  title: string;
  body: string;
  confirmText: string;
  confirmLabel: string;
  Icon: LucideIcon;
  onConfirm: () => void;
  /** Shown after confirming, while this component stays mounted. */
  done?: string;
}) {
  const t = useT();
  const [step, setStep] = useState<"idle" | "confirm" | "done">("idle");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (step === "confirm") cancelRef.current?.focus();
    if (step !== "confirm" && returnFocus.current) {
      returnFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [step]);

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-0.5 max-w-[56ch] text-[13px] text-ink-2">{body}</p>
        <p role="status" className="text-[13px] font-semibold text-ok empty:hidden">
          {step === "done" ? done : ""}
        </p>
      </div>
      {step === "confirm" ? (
        <div className="flex shrink-0 flex-col gap-2 rounded-2xl bg-crit-soft p-3 sm:max-w-[280px]">
          <p className="flex items-start gap-1.5 text-[13px] font-semibold text-crit">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {confirmText}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onConfirm();
                returnFocus.current = true;
                setStep("done");
              }}
              className="min-h-11 rounded-full bg-crit px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-crit/90"
            >
              {confirmLabel}
            </button>
            <button
              ref={cancelRef}
              type="button"
              onClick={() => {
                returnFocus.current = true;
                setStep("idle");
              }}
              className="min-h-11 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-sunken"
            >
              {t.common.cancel}
            </button>
          </div>
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setStep("confirm")}
          className="flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full border border-crit/30 px-4 py-2 text-sm font-semibold text-crit transition-colors hover:bg-crit-soft"
        >
          <Icon className="size-4" aria-hidden />
          {title}
        </button>
      )}
    </div>
  );
}
