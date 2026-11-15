"use client";

import Link from "next/link";
import { ShieldAlert, TriangleAlert, X } from "lucide-react";
import { useCrewSession } from "@/lib/session/CrewSession";
import { useLocale, useT } from "@/lib/i18n";
import { alertCopy, safetyMessages } from "@/lib/i18n/pages/safety";

/**
 * Allergy conflicts from the local rules. Shown above everything else on the
 * Now screen; they never depend on the AI being on.
 */
export function SafetyAlerts() {
  const { safety, dismissAlert } = useCrewSession();
  const t = useT();
  const locale = useLocale();
  const m = safetyMessages[locale];
  if (!safety.length) return null;

  return (
    <section aria-label={m.title} className="flex flex-col gap-2">
      {safety.map((a) => {
        const copy = alertCopy(a, t, locale);
        const urgent = a.level === 3;
        // Solid red only for a reaction, the one alert that makes the status critical;
        // a level-3 exposure or medication conflict is "attention" and must look like it.
        const crit = urgent && a.kind === "reaction";
        const Icon = urgent ? ShieldAlert : TriangleAlert;
        const tone = crit ? "bg-crit text-white" : urgent ? "bg-crit-soft text-ink" : "bg-warn-soft text-ink";
        const accent = crit ? "" : urgent ? "text-crit" : "text-warn";
        return (
          <div key={a.key} role={urgent ? "alert" : "status"} className={`flex items-start gap-3 rounded-3xl px-4 py-3.5 shadow-card sm:px-5 ${tone}`}>
            <Icon className={`mt-0.5 size-5 shrink-0 ${accent}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className={`text-[15px] leading-snug font-semibold ${accent}`}>{copy.head}</p>
              <p className={`mt-1 text-sm leading-relaxed ${crit ? "text-white/90" : "text-ink-2"}`}>{copy.body}</p>
              <p className={`mt-1.5 text-xs ${crit ? "text-white/80" : "text-ink-2"}`}>
                {m.noAi}{" "}
                <Link href="/profile" className="font-semibold underline-offset-2 hover:underline">
                  {m.profileLink}
                </Link>
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismissAlert(a.key, copy.head)}
              aria-label={m.dismissLabel(copy.head)}
              title={m.dismiss}
              className={`-mt-1 -mr-2 flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors sm:min-h-9 ${
                crit ? "text-white/90 hover:bg-white/15" : urgent ? "text-crit hover:bg-surface" : "text-warn hover:bg-surface"
              }`}
            >
              <X className="size-4" aria-hidden />
              <span className="hidden sm:inline">{m.dismiss}</span>
            </button>
          </div>
        );
      })}
    </section>
  );
}
