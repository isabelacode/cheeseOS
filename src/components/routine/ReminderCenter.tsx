"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { routineMessages } from "@/lib/i18n/pages/routine";
import { REMINDER_MISSION, dueReminders, ensureSince, markFired, missionsToday, useRoutine, type ReminderId } from "@/lib/routine/routine";

const HREF: Record<ReminderId, string> = {
  checkin: "/#report",
  vitals: "/sinais",
  exercise: "/",
  hydration: "/",
  medication: "/perfil",
};

/** The screen a reminder points to, without the hash. */
const pathOf = (id: ReminderId) => HREF[id].split("#")[0] || "/";

/**
 * Checks the local reminders every 30 s while the app is open. A due reminder
 * shows once a day as an in-app notice and, when allowed, a system notification.
 * The in-app notice is skipped on the screen it points to: the mission is already there.
 */
export function ReminderCenter() {
  const routine = useRoutine();
  const r = routineMessages[useLocale()];
  const pathname = usePathname();
  const [shown, setShown] = useState<ReminderId[]>([]);

  // Arriving at the screen a notice points to dismisses it for good.
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setShown((cur) => cur.filter((id) => pathOf(id) !== pathname));
  }

  useEffect(() => {
    ensureSince();
    const check = () => {
      const due = dueReminders(routine);
      if (!due.length) return;
      markFired(due);
      const elsewhere = due.filter((id) => pathOf(id) !== pathname);
      if (elsewhere.length) setShown((cur) => [...new Set([...cur, ...elsewhere])]);
      if (routine.notify && typeof Notification !== "undefined" && Notification.permission === "granted") {
        for (const id of due) {
          try {
            new Notification(`cheeseOS · ${r.reminders[id].label}`, { body: r.reminders[id].body, tag: `cheeseos-${id}`, icon: "/icon.png" });
          } catch {
            /* some browsers only allow notifications from a service worker */
          }
        }
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [routine, r, pathname]);

  // A reminder whose mission got done meanwhile disappears on its own.
  const done = missionsToday(routine);
  const visible = shown.filter((id) => {
    const m = REMINDER_MISSION[id];
    return (!m || !done[m]) && pathOf(id) !== pathname;
  });
  if (!visible.length) return null;
  const close = (id: ReminderId) => setShown((cur) => cur.filter((x) => x !== id));

  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-40 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:w-[360px]">
      {visible.map((id) => (
        <div key={id} role="status" className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl bg-surface px-4 py-3 shadow-card ring-1 ring-line">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
            <BellRing className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink-3">{r.toast.title}</p>
            <p className="text-sm font-semibold">{r.reminders[id].label}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{r.reminders[id].body}</p>
            <Link href={HREF[id]} onClick={() => close(id)} className="mt-1.5 inline-flex min-h-9 items-center text-sm font-semibold text-accent-ink hover:underline">
              {r.toast.open}
            </Link>
          </div>
          <button type="button" onClick={() => close(id)} aria-label={r.toast.dismiss} className="grid size-9 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-sunken">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
