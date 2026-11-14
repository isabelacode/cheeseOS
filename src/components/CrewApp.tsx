"use client";

import type { ReactNode } from "react";
import { useCrewProfile } from "@/lib/crew/profile";
import { useDocumentLocale } from "@/lib/i18n";
import { CrewSessionProvider } from "@/lib/session/CrewSession";
import { Onboarding } from "./Onboarding";
import { AppShell } from "./shell/AppShell";

/** Gate for every route: first run shows onboarding, then the shell with the live session. */
export function CrewApp({ children }: { children: ReactNode }) {
  const profile = useCrewProfile();
  useDocumentLocale();

  // Server render and first paint: the profile lives in this device's storage.
  if (profile === undefined) return <div className="min-h-screen" aria-busy="true" />;
  if (!profile) return <Onboarding initial={null} />;
  return (
    <CrewSessionProvider profile={profile}>
      <AppShell>{children}</AppShell>
    </CrewSessionProvider>
  );
}
