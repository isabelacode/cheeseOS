"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Play, Plus, RotateCcw, X } from "lucide-react";
import { useCrewSession } from "@/lib/session/CrewSession";
import { useLocale, formatNumber } from "@/lib/i18n";
import { trainerMessages } from "@/lib/i18n/pages/trainer";
import { EXERCISES, type ExerciseId } from "@/lib/exercise/exercises";
import { addSession } from "@/lib/exercise/history";
import { JOINT_POINTS, MIN_VISIBILITY, REP_START, jointAngle, stepRep, summarize, type Point, type RepEvent, type RepState, type RepSummary } from "@/lib/exercise/pose";
import { setMission } from "@/lib/routine/routine";
import { usePoseTracker, type PoseFrame } from "@/hooks/usePoseTracker";

// Three.js loads only when a tutorial is shown.
const ExerciseDemo = dynamic(() => import("./ExerciseDemo"), { ssr: false });

type Cue = "frame" | "ready" | "good" | "fuller" | "slower";

/** Body segments drawn over the video (face and hands left out). */
const BONES: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
];

/** After this long without the working joint in view, ask the crew member to step back. */
const LOST_MS = 1200;

function drawSkeleton(canvas: HTMLCanvasElement, video: HTMLVideoElement, pose: Point[] | null, joints: Set<number>) {
  if (video.videoWidth && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  if (!pose) return;
  const seen = (i: number) => (pose[i]?.visibility ?? 0) >= MIN_VISIBILITY;
  const unit = Math.max(w, h) / 160;
  ctx.lineCap = "round";
  ctx.lineWidth = unit;
  ctx.strokeStyle = "#f6bb2f";
  for (const [a, b] of BONES) {
    if (!seen(a) || !seen(b)) continue;
    ctx.beginPath();
    ctx.moveTo(pose[a].x * w, pose[a].y * h);
    ctx.lineTo(pose[b].x * w, pose[b].y * h);
    ctx.stroke();
  }
  for (const i of new Set(BONES.flat())) {
    if (!seen(i)) continue;
    // The joint being measured stands out.
    const big = joints.has(i);
    ctx.beginPath();
    ctx.arc(pose[i].x * w, pose[i].y * h, unit * (big ? 1.7 : 0.9), 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    if (big) {
      ctx.lineWidth = unit * 0.7;
      ctx.stroke();
      ctx.lineWidth = unit;
    }
  }
}

/**
 * One set of one exercise, full screen: the camera counts, the crew member moves.
 * It opens on the tutorial (unless `intro` is off, for a repeated set) while the camera warms up.
 * Mount it with a fresh `key` for each set.
 */
export function TrainerSession({
  id,
  next,
  intro,
  onClose,
  onAgain,
  onNext,
}: {
  id: ExerciseId;
  next: ExerciseId | null;
  intro: boolean;
  onClose: () => void;
  onAgain: () => void;
  onNext: (id: ExerciseId) => void;
}) {
  const { profile } = useCrewSession();
  const femininity = profile.sex === "feminino" ? 1 : profile.sex === "masculino" ? 0 : 0.5;
  const locale = useLocale();
  const m = trainerMessages[locale];
  const copy = m.exercises[id];
  const { rule, target } = EXERCISES[id];

  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rep = useRef<RepState>(REP_START);
  const events = useRef<RepEvent[]>([]);
  const byHand = useRef(0);
  const lastSeen = useRef(0);
  const cueRef = useRef<Cue>("frame");

  const [started, setStarted] = useState(!intro);
  const startedRef = useRef(!intro);
  const [reps, setReps] = useState(0);
  const [cue, setCueState] = useState<Cue>("frame");
  const [summary, setSummary] = useState<(RepSummary & { tracked: boolean }) | null>(null);
  const live = summary === null;

  const setCue = (c: Cue) => {
    if (cueRef.current === c) return;
    cueRef.current = c;
    setCueState(c);
  };

  const finish = useCallback(() => {
    setSummary((done) => {
      if (done) return done;
      const s = summarize(events.current);
      const total = s.reps + byHand.current;
      return { reps: total, good: s.good, avgMs: s.avgMs, tracked: byHand.current === 0 };
    });
  }, []);

  // Saved once, when the set ends with at least one repetition.
  useEffect(() => {
    if (!summary || summary.reps === 0) return;
    const at = Date.now();
    addSession({ at, exercise: id, reps: summary.reps, good: summary.good, avgMs: summary.avgMs, tracked: summary.tracked });
    setMission("exercise", true, at);
  }, [summary, id]);

  const onFrame = (frame: PoseFrame | null, at: number) => {
    // The tutorial is still on screen: the camera is only warming up.
    if (!startedRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) drawSkeleton(canvas, video, frame?.image ?? null, new Set(JOINT_POINTS[rule.joint].map((t) => t[1])));
    const angle = frame ? jointAngle(frame.world, rule.joint, rule.combine) : null;
    if (angle === null) {
      if (at - lastSeen.current > LOST_MS) setCue("frame");
      return;
    }
    lastSeen.current = at;
    if (cueRef.current === "frame") setCue("ready");
    const out = stepRep(rep.current, rule, angle, at);
    rep.current = out.state;
    if (!out.rep) return;
    events.current.push(out.rep);
    setReps(events.current.length);
    setCue(!out.rep.good ? "fuller" : out.rep.rushed ? "slower" : "good");
    if (events.current.length >= target) finish();
  };

  const tracker = usePoseTracker(videoRef, onFrame, live);
  const noCamera = tracker === "denied" || tracker === "nocamera" || tracker === "error";

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  /** Leaving with repetitions counted goes through the summary, so they are saved. */
  const leave = () => (live && reps > 0 ? finish() : onClose());

  const cueText = cue === "fuller" ? copy.fuller : m.session[cue];
  const status = tracker === "ready" ? cueText : m.session[tracker];
  const corrective = tracker === "ready" && cue !== "good" && cue !== "ready";
  const shown = summary?.reps ?? reps;

  return (
    <dialog
      ref={dialogRef}
      aria-label={copy.name}
      onCancel={(e) => {
        e.preventDefault();
        leave();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink p-0 text-white backdrop:bg-ink"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold">{copy.name}</h2>
            <p className="truncate text-sm text-white/75">{live ? copy.setup : copy.muscles}</p>
          </div>
          {live && started && (
            <button type="button" onClick={finish} className="min-h-11 rounded-full bg-white/15 px-5 text-base font-bold transition-colors hover:bg-white/25">
              {m.session.finish}
            </button>
          )}
          <button type="button" onClick={leave} aria-label={m.session.close} className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 transition-colors hover:bg-white/25">
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="h-1.5 bg-white/15" aria-hidden>
          <div className="h-full bg-cheese transition-[width] duration-300" style={{ width: `${Math.min(1, shown / target) * 100}%` }} />
        </div>

        {live ? (
          <div className="relative min-h-0 flex-1">
            {/* Mirrored, like a gym mirror: moving left moves the image left. */}
            <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-contain" />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100 object-contain" aria-hidden />

            {!started && (
              <div className="absolute inset-0 overflow-y-auto bg-ink">
                <div className="mx-auto grid min-h-full w-full max-w-5xl items-center gap-4 px-4 py-5 md:grid-cols-2 md:gap-10">
                  <div className="h-[38dvh] min-h-56 md:h-[70dvh]">
                    <ExerciseDemo id={id} femininity={femininity} label={m.tutorial.demo(copy.name)} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{m.tutorial.title}</h3>
                    <ol className="mt-4 flex flex-col gap-3.5">
                      {copy.steps.map((step, i) => (
                        <li key={step} className="flex items-start gap-3 text-lg leading-snug">
                          <span className="tabular grid size-8 shrink-0 place-items-center rounded-full bg-white/15 text-base font-bold" aria-hidden>
                            {i + 1}
                          </span>
                          <span className="pt-0.5">{step}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-5 text-base text-white/75">{copy.setup}</p>
                    <button
                      type="button"
                      autoFocus
                      onClick={() => {
                        startedRef.current = true;
                        setStarted(true);
                      }}
                      className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-cheese px-8 text-lg font-bold text-cheese-ink transition-transform active:scale-[0.98] md:w-auto"
                    >
                      <Play className="size-5" aria-hidden />
                      {m.tutorial.begin}
                    </button>
                    <p role="status" className="mt-3 text-sm text-white/75">
                      {tracker === "ready" ? m.session.ready : m.session[tracker]}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {started && (
              <div className="absolute top-4 right-4 hidden h-48 w-36 overflow-hidden rounded-3xl bg-ink/80 sm:block md:h-60 md:w-44">
                <ExerciseDemo id={id} femininity={femininity} label={m.tutorial.demo(copy.name)} />
              </div>
            )}

            <p hidden={!started} className="absolute top-4 left-4 rounded-3xl bg-ink/80 px-5 py-3" aria-live="polite" aria-atomic="true" aria-label={m.session.counter(reps, target)}>
              <span className="tabular block text-7xl leading-none font-bold" aria-hidden>
                {reps}
              </span>
              <span className="tabular mt-1 block text-base text-white/80" aria-hidden>
                {m.session.of(target)}
              </span>
            </p>

            <div hidden={!started} className="absolute inset-x-4 bottom-5 flex flex-col items-center gap-3 [&[hidden]]:hidden">
              <p
                role="status"
                className={`max-w-xl rounded-3xl px-6 py-3 text-center text-xl font-bold ${
                  corrective || noCamera ? "bg-cheese text-cheese-ink" : "bg-ink/80 text-white"
                }`}
              >
                {status}
              </p>
              {noCamera && (
                <button
                  type="button"
                  onClick={() => {
                    byHand.current += 1;
                    const total = events.current.length + byHand.current;
                    setReps(total);
                    if (total >= target) finish();
                  }}
                  className="flex min-h-14 items-center gap-2 rounded-full bg-white px-7 text-lg font-bold text-ink transition-transform active:scale-95"
                >
                  <Plus className="size-5" aria-hidden />
                  {m.session.addRep}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto px-4 py-8">
            <div className="w-full max-w-md">
              <p className="flex items-center gap-2 text-2xl font-bold">
                {summary.reps > 0 && (
                  <span className="grid size-8 place-items-center rounded-full bg-ok text-white">
                    <Check className="size-5" strokeWidth={3} aria-hidden />
                  </span>
                )}
                {summary.reps >= target ? m.session.targetHit : summary.reps > 0 ? m.summary.title : copy.name}
              </p>
              {summary.reps > 0 ? (
                <>
                  <dl className="mt-5 divide-y divide-white/15 border-y border-white/15 text-lg">
                    <div className="flex items-baseline justify-between gap-4 py-3">
                      <dt className="text-white/80">{m.summary.reps}</dt>
                      <dd className="tabular text-3xl font-bold">{summary.reps}</dd>
                    </div>
                    {summary.tracked ? (
                      <>
                        <div className="flex items-baseline justify-between gap-4 py-3">
                          <dt className="text-white/80">{m.summary.form}</dt>
                          <dd className="tabular font-bold">{m.summary.formValue(summary.good, summary.reps)}</dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-4 py-3">
                          <dt className="text-white/80">{m.summary.tempo}</dt>
                          <dd className="tabular font-bold">{m.summary.tempoValue(formatNumber(summary.avgMs / 1000, 1, locale))}</dd>
                        </div>
                      </>
                    ) : (
                      <div className="py-3 text-white/80">{m.session.byHand}</div>
                    )}
                  </dl>
                  <p className="mt-4 text-base text-white/80">{m.summary.saved}</p>
                </>
              ) : (
                <p className="mt-3 text-lg text-white/80">{m.summary.none}</p>
              )}
              <div className="mt-7 flex flex-col gap-2.5">
                {next && summary.reps > 0 && (
                  <button type="button" autoFocus onClick={() => onNext(next)} className="flex min-h-14 items-center justify-between gap-3 rounded-full bg-cheese px-6 text-lg font-bold text-cheese-ink">
                    {m.summary.next(m.exercises[next].name)}
                    <ArrowRight className="size-5" aria-hidden />
                  </button>
                )}
                <button type="button" onClick={onAgain} className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-white/15 px-6 text-lg font-bold transition-colors hover:bg-white/25">
                  <RotateCcw className="size-5" aria-hidden />
                  {m.summary.again}
                </button>
                <button type="button" onClick={onClose} className="min-h-14 rounded-full px-6 text-lg font-bold text-white/85 transition-colors hover:bg-white/10">
                  {m.summary.list}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
