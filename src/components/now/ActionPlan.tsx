"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, Sparkles, Undo2, X } from "lucide-react";
import { useCrewSession } from "@/lib/session/CrewSession";
import { firstName } from "@/lib/crew/profile";
import { VITAL_SPECS } from "@/lib/health/vitals";
import { adviceOf } from "@/lib/health/advice";
import type { Severity, Status, SymptomId } from "@/lib/health/types";
import { useLocale, useT } from "@/lib/i18n";
import { nowMessages } from "@/lib/i18n/pages/now";
import { soundsMoreUrgent } from "@/lib/text/urgency";
import { SafeMarkdown } from "@/components/now/SafeMarkdown";
import { SpaceWhy } from "@/components/science/SpaceWhy";
import { SEVERITY_CHIP, formatVital } from "@/components/health/ui";

const STATUS_TEXT: Record<Status, string> = { nominal: "text-ok", attention: "text-warn", critical: "text-crit" };

/** Header band of a symptom: only the worst level takes the solid alarm colour. */
const STEP_HEAD: Record<Severity, string> = {
  0: "bg-sunken text-ink",
  1: "bg-mild-soft text-ink",
  2: "bg-warn-soft text-ink",
  3: "bg-crit text-white",
};

/**
 * Top of the Now screen. On a good day it is one status line and one question;
 * with a symptom it becomes the list of what to do, from the local rules.
 */
export function ActionPlan() {
  const { status, findings, feedback, vitals, recovering, profile, resolveFinding, dismissFinding, undo, canUndo } = useCrewSession();
  const t = useT();
  const locale = useLocale();
  const n = nowMessages[locale];
  const copy = t.status[status];

  // Worst first: the headline names it and its guidance leads.
  const ordered = [...findings].sort((a, b) => b.severity - a.severity);
  const top = ordered[0];
  // Vitals that hold the status at or above every reported symptom: say so, or the
  // status looks stuck (simulated vitals ease back over a few minutes).
  const findingMax = top?.severity ?? 0;
  const drivers = VITAL_SPECS.filter((sp) => {
    const sev = sp.assess(vitals);
    return sev >= 2 && sev > findingMax;
  });

  // A severe symptom needs a second tap to be marked gone; the first arms it for a few seconds.
  const [confirming, setConfirming] = useState<SymptomId | null>(null);
  useEffect(() => {
    if (!confirming) return;
    const id = setTimeout(() => setConfirming(null), 4000);
    return () => clearTimeout(id);
  }, [confirming]);

  const aiText = feedback.text;
  const escalates = aiText ? soundsMoreUrgent(aiText, feedback.status ?? status) : false;

  const headline = top
    ? (status === "critical" ? n.doNow : n.toDo)(t.symptoms[top.id].label)
    : status === "nominal"
      ? n.ask(firstName(profile))
      : copy.summary;

  return (
    <section aria-label={t.dashboard.healthState}>
      <p className={`flex flex-wrap items-center gap-x-2.5 text-lg font-bold ${STATUS_TEXT[status]}`} aria-live="polite">
        <span className="size-3 rounded-full bg-current" aria-hidden />
        {copy.label}
        {(top || status === "nominal") && <span className="text-base font-normal text-ink-2">{copy.summary}</span>}
      </p>
      <h1 className="mt-3 text-[34px] leading-[1.08] font-bold tracking-tight text-balance sm:text-5xl">{headline}</h1>

      {ordered.length > 0 && (
        <ol className="mt-7 grid gap-3">
          {ordered.map((f, i) => {
            const label = t.symptoms[f.id].label;
            const solid = f.severity === 3;
            return (
              <li key={f.id} className="overflow-hidden rounded-3xl bg-surface shadow-card">
                <div className={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 px-5 py-4 ${STEP_HEAD[f.severity]}`}>
                  <span
                    className={`tabular grid size-11 place-items-center rounded-full text-xl font-bold ${solid ? "bg-white/20" : "bg-surface"}`}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    {/* The headline already names the first one. */}
                    {i > 0 && (
                      <p className={`mb-1 flex flex-wrap items-center gap-2 text-sm font-bold ${solid ? "text-white/90" : "text-ink-2"}`}>
                        {label}
                        <span className={`rounded-md px-1.5 py-0.5 ${solid ? "bg-white/20 text-white" : SEVERITY_CHIP[f.severity]}`}>{t.severity[f.severity]}</span>
                      </p>
                    )}
                    <p className={`text-xl leading-snug font-bold text-pretty ${i === 0 ? "py-1.5" : ""}`}>{adviceOf(f, t)}</p>
                  </div>
                </div>
                <div className="px-5 py-3">
                  <SpaceWhy finding={f} />
                  <div className="flex flex-wrap gap-2 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (f.severity >= 3 && confirming !== f.id) {
                          setConfirming(f.id);
                          return;
                        }
                        setConfirming(null);
                        resolveFinding(f.id);
                      }}
                      aria-label={confirming === f.id ? n.resolveConfirmLabel(label) : n.resolveLabel(label)}
                      className={`flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors ${
                        confirming === f.id ? "bg-ok-soft text-ok ring-1 ring-ok/40" : "bg-sunken text-ink hover:bg-ok-soft hover:text-ok"
                      }`}
                    >
                      <Check className="size-4" aria-hidden /> {confirming === f.id ? n.resolveConfirm : n.resolve}
                    </button>
                    <button
                      type="button"
                      onClick={() => dismissFinding(f.id)}
                      aria-label={n.dismissLabel(label)}
                      className="flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
                    >
                      <X className="size-4" aria-hidden /> {n.dismiss}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {!top && status !== "nominal" && !drivers.length && <p className="mt-4 max-w-[68ch] text-base leading-relaxed text-ink">{n.vitalsOnly}</p>}
      {drivers.length > 0 && (
        <p className="mt-4 max-w-[68ch] rounded-2xl bg-warn-soft px-4 py-3 text-base leading-relaxed text-ink">
          {n.heldBy(
            drivers.map((sp) => `${t.vitals[sp.key].label} ${formatVital(sp, vitals, locale)} ${sp.unit}`).join(", "),
            copy.label,
            findings.length > 0,
          )}
        </p>
      )}
      {recovering && <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-ok">{n.recovering}</p>}

      {!feedback.pending && !aiText && feedback.dropped && n.aiDropped[feedback.dropped] && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-sunken px-4 py-3 text-sm text-ink-2" aria-live="polite">
          <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
          {n.aiDropped[feedback.dropped]}
        </p>
      )}
      {(feedback.pending || aiText) && (
        <div className="mt-4 rounded-2xl bg-sunken px-4 py-3" aria-live="polite">
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm font-bold text-ink-2">
            <Sparkles className="size-4 text-accent-ink" aria-hidden />
            {n.aiSuggestion}
            {feedback.engine && !feedback.pending && <span className="font-normal">· {feedback.engine}</span>}
          </p>
          {feedback.pending ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-2">
              <Loader2 className="size-4 animate-spin" aria-hidden /> {t.dashboard.refining}
            </p>
          ) : (
            aiText && (
              <>
                <SafeMarkdown text={aiText} className="mt-1.5 max-w-[68ch] text-base leading-relaxed text-ink-2" />
                {escalates && (
                  <p className="mt-2.5 flex items-start gap-2 rounded-xl bg-warn-soft px-3 py-2 text-sm font-medium text-warn">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {n.aiEscalates(copy.label.toLowerCase())}
                  </p>
                )}
              </>
            )
          )}
        </div>
      )}

      {canUndo && (
        <button
          type="button"
          onClick={undo}
          title={t.nav.undoHint}
          className="mt-3 flex min-h-11 items-center gap-1.5 rounded-full text-sm font-bold text-accent-ink hover:underline"
        >
          <Undo2 className="size-4" aria-hidden /> {t.nav.undoLast}
        </button>
      )}
    </section>
  );
}
