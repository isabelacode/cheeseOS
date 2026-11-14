"use client";

import { useState } from "react";
import { useCrewSession } from "@/lib/session/CrewSession";
import { firstName } from "@/lib/crew/profile";
import { useT } from "@/lib/i18n";
import { StatusCard } from "@/components/health/ui";
import { VoiceCard } from "@/components/health/ReportComposer";
import { BodyPanel } from "@/components/health/BodyPanel";
import { VitalsStrip } from "@/components/now/VitalsStrip";
import { SafetyAlerts } from "@/components/health/SafetyAlerts";
import { MissionsCard } from "@/components/routine/MissionsCard";

/** "What do I do now": status and guidance first, then reporting, vitals and the body. */
export function NowView() {
  const s = useCrewSession();
  const t = useT();
  const d = t.dashboard;
  const [draft, setDraft] = useState("");
  const { profile } = s;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{d.hello(firstName(profile))}</h1>
        <p className="text-sm text-balance break-words text-ink-2">
          {[profile.role, profile.mission, d.years(profile.age), profile.bloodType].filter(Boolean).join(" · ")}
        </p>
      </header>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          <SafetyAlerts />
          <StatusCard
            status={s.status}
            vitals={s.vitals}
            feedback={s.feedback}
            findings={s.findings}
            onResolve={s.resolveFinding}
            onDismiss={s.dismissFinding}
            onUndo={s.undo}
            canUndo={s.canUndo}
            recovering={s.recovering}
          />
          <VoiceCard
            micState={s.mic.state}
            level={s.mic.level}
            speaking={s.mic.speaking}
            transcribing={s.transcribing}
            stt={s.ai.models.stt}
            entries={s.entries}
            draft={draft}
            setDraft={setDraft}
            limit={3}
            logHref="/relatos"
            onSubmit={(text) => {
              s.report(text, "typed");
              setDraft("");
            }}
          />
          <VitalsStrip vitals={s.vitals} />
          <MissionsCard />
        </div>
        <BodyPanel className="h-[420px] lg:sticky lg:top-6 lg:h-[calc(100vh-140px)] lg:min-h-[560px]" />
      </div>
    </div>
  );
}
