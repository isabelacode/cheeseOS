"use client";

import { useState } from "react";
import { useCrewProfile } from "@/lib/crew/profile";
import { useDocumentLocale } from "@/lib/i18n";
import { Onboarding } from "./Onboarding";
import { TwinDashboard } from "./TwinDashboard";

export function CrewApp() {
  const profile = useCrewProfile();
  const [editing, setEditing] = useState(false);
  useDocumentLocale();

  // Server render and first paint: the profile lives in this device's storage.
  if (profile === undefined) return <div className="min-h-screen" aria-busy="true" />;
  if (!profile || editing) return <Onboarding initial={profile} onDone={() => setEditing(false)} />;
  return <TwinDashboard key={profile.restingHeartRate} profile={profile} onEditProfile={() => setEditing(true)} />;
}
