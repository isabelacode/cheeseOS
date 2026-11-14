"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Cpu,
  HeartPulse,
  LayoutGrid,
  Mic,
  MicOff,
  NotebookText,
  PersonStanding,
  PowerOff,
  Settings2,
  ShieldAlert,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useCrewSession } from "@/lib/session/CrewSession";
import { UndoBar } from "./UndoBar";
import { useT, type Messages } from "@/lib/i18n";
import type { Status } from "@/lib/health/types";

type NavKey = keyof Pick<Messages["nav"], "now" | "vitals" | "log" | "body" | "profile" | "settings">;

const PRIMARY: { href: string; key: NavKey; Icon: LucideIcon }[] = [
  { href: "/", key: "now", Icon: LayoutGrid },
  { href: "/sinais", key: "vitals", Icon: HeartPulse },
  { href: "/relatos", key: "log", Icon: NotebookText },
  { href: "/corpo", key: "body", Icon: PersonStanding },
];

const UTILITY: { href: string; key: NavKey; Icon: LucideIcon }[] = [
  { href: "/perfil", key: "profile", Icon: UserRound },
  { href: "/ajustes", key: "settings", Icon: Settings2 },
];

const STATUS_PILL: Record<Status, { className: string; Icon: LucideIcon }> = {
  nominal: { className: "bg-ok-soft text-ok", Icon: CheckCircle2 },
  attention: { className: "bg-warn-soft text-warn", Icon: AlertTriangle },
  critical: { className: "bg-crit text-white", Icon: ShieldAlert },
};

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function RailLink({ href, label, Icon, active }: { href: string; label: string; Icon: LucideIcon; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold transition-colors duration-200 ${
        active ? "text-accent-ink" : "text-ink-2 hover:text-ink"
      }`}
    >
      <span
        className={`grid size-10 place-items-center rounded-full transition-colors duration-200 ${
          active ? "bg-accent text-white shadow-card" : "bg-surface shadow-card group-hover:bg-accent-soft group-hover:text-accent-ink"
        }`}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      {label}
    </Link>
  );
}

function Rail() {
  const t = useT();
  const pathname = usePathname();
  return (
    <nav aria-label={t.nav.label} className="sticky top-6 hidden h-[calc(100vh-48px)] w-[76px] shrink-0 flex-col items-center sm:flex">
      <Link href="/" className="grid size-12 place-items-center rounded-2xl bg-surface shadow-card" aria-label="cheeseOS">
        <span className="flex items-start text-xl leading-none font-bold tracking-tight">
          c<span className="-mt-1 ml-px text-sm text-accent">+</span>
        </span>
      </Link>
      <ul className="my-auto flex w-full flex-col gap-1">
        {PRIMARY.map(({ href, key, Icon }) => (
          <li key={href}>
            <RailLink href={href} label={t.nav[key]} Icon={Icon} active={isActive(pathname, href)} />
          </li>
        ))}
      </ul>
      <ul className="flex w-full flex-col gap-1">
        {UTILITY.map(({ href, key, Icon }) => (
          <li key={href}>
            <RailLink href={href} label={t.nav[key]} Icon={Icon} active={isActive(pathname, href)} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Phone: thumb-reachable tab bar. Crew profile is reached from Settings. */
function TabBar() {
  const t = useT();
  const pathname = usePathname();
  const items = [...PRIMARY, UTILITY[1]];
  return (
    <nav
      aria-label={t.nav.label}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-2 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, key, Icon }) => {
          const active = isActive(pathname, href) || (href === "/ajustes" && isActive(pathname, "/perfil"));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold ${active ? "text-accent-ink" : "text-ink-2"}`}
              >
                <span className={`grid h-7 w-12 place-items-center rounded-full ${active ? "bg-accent-soft" : ""}`}>
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                {t.nav[key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TopBar() {
  const t = useT();
  const { status, ai, mic, live, toggleMic } = useCrewSession();
  const pill = STATUS_PILL[status];
  const privacy =
    ai.active === "openrouter"
      ? { label: t.nav.privacyCloud, Icon: Cloud, className: "text-warn" }
      : ai.active === "off"
        ? { label: t.nav.privacyOff, Icon: PowerOff, className: "text-ink-2" }
        : { label: t.nav.privacyLocal, Icon: Cpu, className: "text-accent-ink" };
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/"
          aria-label={t.nav.statusLink(t.status[status].label)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors duration-500 ${pill.className}`}
        >
          <pill.Icon className="size-4" aria-hidden />
          {t.status[status].label}
        </Link>
        <Link
          href="/ajustes"
          aria-label={t.nav.privacyLink}
          title={t.nav.privacyLink}
          className={`flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold shadow-card transition-colors hover:bg-sunken ${privacy.className}`}
        >
          <privacy.Icon className="size-3.5" aria-hidden />
          <span className="hidden min-[400px]:inline">{privacy.label}</span>
        </Link>
      </div>
      <button
        type="button"
        onClick={toggleMic}
        disabled={mic.state === "requesting"}
        aria-pressed={live}
        title={t.nav.micShortcut}
        aria-keyshortcuts="Space"
        className={`flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold shadow-card transition-colors duration-200 disabled:opacity-60 ${
          live ? "bg-accent text-white hover:bg-accent-ink" : "bg-surface text-ink hover:bg-sunken"
        }`}
      >
        <span className={`grid size-8 place-items-center rounded-full ${live ? "mic-live bg-white/20" : "bg-accent-soft text-accent-ink"}`}>
          {live ? <Mic className="size-4" aria-hidden /> : <MicOff className="size-4" aria-hidden />}
        </span>
        {live ? t.dashboard.micOn : t.dashboard.micOff}
      </button>
    </div>
  );
}

function CriticalBanner() {
  const t = useT();
  const { status } = useCrewSession();
  const pathname = usePathname();
  if (status !== "critical") return null;
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-crit px-4 py-3 text-sm font-semibold text-white">
      <ShieldAlert className="size-5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">{t.nav.criticalBanner}</p>
      {pathname !== "/" && (
        <Link href="/" className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25">
          {t.nav.criticalAction}
        </Link>
      )}
    </div>
  );
}

/** Space toggles listening when focus is not in a text field or on a control. */
function useMicShortcut() {
  const { toggleMic } = useCrewSession();
  useEffect(() => {
    // A Space typed mid-sentence with focus lost (missed click) must not open the mic.
    let lastKey = 0;
    const onKey = (e: KeyboardEvent) => {
      const prev = lastKey;
      lastKey = e.timeStamp;
      if (e.code !== "Space" || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.timeStamp - prev < 1200) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, button, a, [contenteditable], [role=radio], [role=slider], dialog")) return;
      e.preventDefault();
      toggleMic();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleMic]);
}

export function AppShell({ children }: { children: ReactNode }) {
  useMicShortcut();
  return (
    <div className="flex min-h-screen gap-4 p-3 pb-24 sm:p-4 lg:gap-6 lg:p-6 sm:pb-4 lg:pb-6">
      <Rail />
      <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-5">
        <TopBar />
        <CriticalBanner />
        <main id="conteudo" className="flex min-w-0 flex-1 flex-col">
          {children}
        </main>
      </div>
      <TabBar />
      <UndoBar />
    </div>
  );
}
