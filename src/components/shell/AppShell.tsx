"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Activity, AlertTriangle, CheckCircle2, Cloud, Cpu, Mic, MicOff, PowerOff, ShieldAlert, UserRound, type LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { useCrewSession } from "@/lib/session/CrewSession";
import { UndoBar } from "./UndoBar";
import { ReminderCenter } from "@/components/routine/ReminderCenter";
import { adviceOf } from "@/lib/health/advice";
import { alertCopy } from "@/lib/i18n/pages/safety";
import { scienceMessages } from "@/lib/science/nasa";
import { useLocale } from "@/lib/i18n";
import { settingsMessages } from "@/lib/i18n/pages/settings";
import { useT, type Messages } from "@/lib/i18n";
import type { Status } from "@/lib/health/types";

type AreaKey = keyof Pick<Messages["nav"], "now" | "history" | "me">;
type PageKey = keyof Pick<Messages["nav"], "vitals" | "log" | "body" | "profile" | "settings"> | "science";

/**
 * Three places, named for what the crew member wants: report now, look back, or
 * manage their own data. Each area's pages share a row of tabs under the top bar.
 */
const AREAS: { href: string; key: AreaKey; Icon: LucideIcon; pages: { href: string; key: PageKey }[] }[] = [
  { href: "/", key: "now", Icon: Mic, pages: [] },
  {
    href: "/relatos",
    key: "history",
    Icon: Activity,
    pages: [
      { href: "/relatos", key: "log" },
      { href: "/sinais", key: "vitals" },
      { href: "/corpo", key: "body" },
    ],
  },
  {
    href: "/perfil",
    key: "me",
    Icon: UserRound,
    pages: [
      { href: "/perfil", key: "profile" },
      { href: "/ajustes", key: "settings" },
      { href: "/ciencia", key: "science" },
    ],
  },
];

const STATUS_PILL: Record<Status, { className: string; Icon: LucideIcon }> = {
  nominal: { className: "bg-ok-soft text-ok", Icon: CheckCircle2 },
  attention: { className: "bg-warn-soft text-warn", Icon: AlertTriangle },
  critical: { className: "bg-crit text-white", Icon: ShieldAlert },
};

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function areaOf(pathname: string) {
  return AREAS.find((a) => (a.pages.length ? a.pages.some((p) => isActive(pathname, p.href)) : isActive(pathname, a.href)));
}

function RailLink({ href, label, Icon, active }: { href: string; label: string; Icon: LucideIcon; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-sm transition-colors duration-200 ${
        active ? "bg-ink font-bold text-white" : "text-ink-2 hover:bg-sunken hover:text-ink"
      }`}
    >
      <Icon className="size-6" aria-hidden />
      {label}
    </Link>
  );
}

function Rail() {
  const t = useT();
  const pathname = usePathname();
  const { status } = useCrewSession();
  const area = areaOf(pathname);
  return (
    <nav
      aria-label={t.nav.label}
      className="sticky top-6 hidden h-[calc(100dvh-48px)] w-[88px] shrink-0 flex-col items-center gap-6 overflow-y-auto overscroll-contain [scrollbar-width:none] sm:flex"
    >
      <Link href="/" className="flex shrink-0 flex-col items-center gap-1 text-sm font-bold tracking-tight text-ink" aria-label="cheeseOS">
        {/* The mascot steps aside in an emergency: nothing playful next to "do this now". */}
        <Image
          src="/brand/mascot.webp"
          alt=""
          width={480}
          height={539}
          priority
          className={`h-auto w-[60px] select-none [@media(max-height:620px)]:hidden ${status === "critical" ? "invisible" : ""}`}
          draggable={false}
        />
        cheeseOS
      </Link>
      <ul className="flex w-full flex-col gap-1.5">
        {AREAS.map(({ href, key, Icon }) => (
          <li key={href}>
            <RailLink href={href} label={t.nav[key]} Icon={Icon} active={area?.key === key} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Phone: the same three places within thumb reach. */
function TabBar() {
  const t = useT();
  const pathname = usePathname();
  const area = areaOf(pathname);
  return (
    <nav
      aria-label={t.nav.label}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-3 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] sm:hidden"
    >
      <ul className="grid grid-cols-3 gap-2">
        {AREAS.map(({ href, key, Icon }) => (
          <li key={href}>
            <RailLink href={href} label={t.nav[key]} Icon={Icon} active={area?.key === key} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The pages inside the current area (History: log, vitals, body. Me: crew, settings, science). */
function AreaTabs() {
  const t = useT();
  const locale = useLocale();
  const pathname = usePathname();
  const area = areaOf(pathname);
  if (!area?.pages.length) return null;
  return (
    <nav aria-label={t.nav.sections}>
      <ul className="flex flex-wrap gap-2">
        {area.pages.map(({ href, key }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-full px-5 text-base transition-colors ${
                  active ? "bg-ink font-bold text-white" : "bg-surface text-ink-2 shadow-card hover:text-ink"
                }`}
              >
                {key === "science" ? scienceMessages[locale].navLabel : t.nav[key]}
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
  const { status, ai, mic, live, toggleMic, demo } = useCrewSession();
  const demoCopy = settingsMessages[useLocale()].demo;
  const pill = STATUS_PILL[status];
  // The home view carries the status line and the big microphone itself; repeating them here is noise.
  const onHome = usePathname() === "/";
  const privacy =
    ai.active === "openrouter"
      ? { label: t.nav.privacyCloud, Icon: Cloud, className: "text-warn" }
      : ai.active === "off"
        ? { label: t.nav.privacyOff, Icon: PowerOff, className: "text-ink-2" }
        : { label: t.nav.privacyLocal, Icon: Cpu, className: "text-accent-ink" };
  return (
    <header className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/" aria-label="cheeseOS" className="-m-1 shrink-0 p-1 sm:hidden">
          <BrandMark size={34} />
        </Link>
        {!onHome && (
          <Link
            href="/"
            aria-label={t.nav.statusLink(t.status[status].label)}
            className={`flex min-h-11 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors duration-500 sm:min-h-0 ${pill.className}`}
          >
            <pill.Icon className="size-4" aria-hidden />
            {t.status[status].label}
          </Link>
        )}
        <Link
          href="/ajustes"
          aria-label={t.nav.privacyLink}
          title={t.nav.privacyLink}
          className={`flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold shadow-card transition-colors hover:bg-sunken sm:min-h-0 ${privacy.className}`}
        >
          <privacy.Icon className="size-3.5" aria-hidden />
          <span className="hidden min-[360px]:inline">{privacy.label}</span>
        </Link>
        {demo && (
          <Link
            href="/ajustes#demo"
            title={demoCopy.badgeTitle}
            aria-label={demoCopy.badgeTitle}
            className="rounded-full bg-mild-soft px-2.5 py-1 text-[11px] font-bold tracking-wide text-mild uppercase"
          >
            {demoCopy.badge}
          </Link>
        )}
      </div>
      {!onHome && (
        <button
          type="button"
          onClick={toggleMic}
          disabled={mic.state === "requesting"}
          aria-pressed={live}
          aria-label={live ? t.dashboard.micOn : t.dashboard.micOff}
          title={t.nav.micShortcut}
          aria-keyshortcuts="Space"
          className={`flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-1.5 pl-1.5 text-sm sm:pr-4 font-semibold shadow-card transition-colors duration-200 disabled:opacity-60 ${
            live ? "bg-cheese text-cheese-ink" : "bg-surface text-ink hover:bg-sunken"
          }`}
        >
          <span className={`grid size-8 place-items-center rounded-full ${live ? "mic-live bg-white/30" : "bg-cheese text-cheese-ink"}`}>
            {live ? <Mic className="size-4" aria-hidden /> : <MicOff className="size-4" aria-hidden />}
          </span>
          <span className="sr-only sm:not-sr-only">{live ? t.dashboard.micOn : t.dashboard.micOff}</span>
        </button>
      )}
    </header>
  );
}

function CriticalBanner() {
  const t = useT();
  const locale = useLocale();
  const { status, findings, safety } = useCrewSession();
  const pathname = usePathname();
  // The home headline already says what to do; elsewhere the banner leads back to it.
  if (status !== "critical" || pathname === "/") return null;
  // The specific protocol from the local rules (never the AI): a severe reaction first, then the worst finding.
  const reaction = safety.find((a) => a.kind === "reaction" && a.level === 3);
  const top = findings.find((f) => f.severity >= 3 && f.redFlag) ?? findings.find((f) => f.severity >= 3);
  const reason = reaction
    ? `${alertCopy(reaction, t, locale).head}. ${alertCopy(reaction, t, locale).body}`
    : top
      ? `${t.symptoms[top.id].label}: ${adviceOf(top, t)}`
      : null;
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-crit px-4 py-3 text-sm font-semibold text-white">
      <ShieldAlert className="size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p>{t.nav.criticalBanner}</p>
        {reason && <p className="mt-0.5 font-normal text-white/95">{reason}</p>}
      </div>
      <Link href="/" className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25">
        {t.nav.criticalAction}
      </Link>
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
  const t = useT();
  return (
    <div className="flex min-h-screen gap-4 p-4 pb-28 sm:gap-6 sm:p-4 lg:gap-8 lg:p-6 sm:pb-4 lg:pb-6">
      <a
        href="#conteudo"
        className="sr-only rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
      >
        {t.nav.skip}
      </a>
      <Rail />
      <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-5">
        <TopBar />
        <CriticalBanner />
        <AreaTabs />
        <main id="conteudo" tabIndex={-1} className="flex min-w-0 flex-1 flex-col scroll-mt-4 outline-none">
          {children}
        </main>
      </div>
      <TabBar />
      <UndoBar />
      <ReminderCenter />
    </div>
  );
}
