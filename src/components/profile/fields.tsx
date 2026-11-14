"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Check, Pencil } from "lucide-react";
import { useT } from "@/lib/i18n";

/** Same ranges as onboarding. */
export function numberIn(v: string, min: number, max: number) {
  const n = Number(v.replace(",", "."));
  return v.trim() !== "" && Number.isFinite(n) && n >= min && n <= max;
}

export const toInt = (v: string) => Math.round(Number(v.replace(",", ".")));

export function inputClass(error?: string) {
  return `w-full rounded-xl border bg-sunken px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-accent focus:bg-surface ${
    error ? "border-crit" : "border-transparent"
  }`;
}

/** Label + control + error/hint. The control gets its id and aria wiring from `children(props)`. */
export function Field({
  label,
  children,
  error,
  optional,
  suffix,
  hint,
}: {
  label: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
  error?: string;
  optional?: boolean;
  suffix?: string;
  hint?: string;
}) {
  const t = useT();
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-[13px] font-semibold">
        <span>
          {label}
          {suffix && <span className="font-normal text-ink-2"> ({suffix})</span>}
        </span>
        {optional && <span className="text-xs font-normal text-ink-2">{t.common.optional}</span>}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": note ? noteId : undefined })}
      {note && (
        <span id={noteId} className={`mt-1 block text-xs ${error ? "text-crit" : "text-ink-2"}`} role={error ? "alert" : undefined}>
          {note}
        </span>
      )}
    </div>
  );
}

/**
 * A profile card that switches between a read-only summary and an inline form.
 * Focus goes to the first field when editing starts and back to "Edit" when it ends.
 */
export function EditableCard({
  id,
  title,
  hint,
  editing,
  saved,
  editLabel,
  editText,
  onEdit,
  onCancel,
  onSubmit,
  view,
  form,
}: {
  id: string;
  title: string;
  hint: string;
  editing: boolean;
  saved: string | null;
  editLabel: string;
  editText: string;
  onEdit: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  view: ReactNode;
  form: ReactNode;
}) {
  const t = useT();
  const formRef = useRef<HTMLFormElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(editing);

  useEffect(() => {
    if (editing && !wasEditing.current) formRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    if (!editing && wasEditing.current) editRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  return (
    <section aria-labelledby={id} className="rounded-3xl bg-surface p-4 shadow-card sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={id} className="flex items-center gap-2 text-[15px] font-semibold">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            {title}
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-2">{hint}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span role="status" className="flex items-center gap-1 text-xs font-semibold text-ok empty:hidden">
            {saved && (
              <>
                <Check className="size-3.5" aria-hidden /> {saved}
              </>
            )}
          </span>
          {!editing && (
            <button
              ref={editRef}
              type="button"
              onClick={onEdit}
              aria-label={editLabel}
              className="flex min-h-11 items-center gap-1.5 rounded-full bg-sunken px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-accent-soft hover:text-accent-ink"
            >
              <Pencil className="size-3.5" aria-hidden />
              {editText}
            </button>
          )}
        </div>
      </div>
      {editing ? (
        <form
          ref={formRef}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
        >
          {form}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onCancel} className="min-h-11 rounded-full px-4 py-2 text-sm font-semibold text-ink-2 transition-colors hover:bg-sunken">
              {t.common.cancel}
            </button>
            <button type="submit" className="min-h-11 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-ink">
              {t.common.save}
            </button>
          </div>
        </form>
      ) : (
        view
      )}
    </section>
  );
}
