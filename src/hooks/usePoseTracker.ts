import { useEffect, useRef, useState, type RefObject } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import type { Point } from "@/lib/exercise/pose";

/**
 * Camera + on-device pose detection (MediaPipe Pose Landmarker). The model and
 * the WebAssembly runtime are served by the app itself (public/pose), so it
 * works with no link to Earth. Frames are analysed in memory and never stored.
 */
export type TrackerState = "requesting" | "loading" | "ready" | "denied" | "nocamera" | "error";

export interface PoseFrame {
  /** Landmarks in image space (0..1), for drawing over the video. */
  image: Point[];
  /** Landmarks in metres around the hips, for angles that hold at any camera angle. */
  world: Point[];
}

const WASM_PATH = "/pose/wasm";
const MODEL_PATH = "/pose/pose_landmarker_lite.task";

/** Loaded once and kept: starting the next exercise is instant. */
let landmarker: Promise<PoseLandmarker> | null = null;

function loadLandmarker(): Promise<PoseLandmarker> {
  landmarker ??= (async () => {
    const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
    const create = (delegate: "GPU" | "CPU") =>
      PoseLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: MODEL_PATH, delegate }, runningMode: "VIDEO", numPoses: 1 });
    try {
      return await create("GPU");
    } catch {
      return await create("CPU");
    }
  })();
  // A failed load (e.g. offline before the first visit) can be retried on the next session.
  landmarker.catch(() => (landmarker = null));
  return landmarker;
}

/**
 * While `enabled`, streams the front camera into `videoRef` and calls `onFrame`
 * for each analysed frame (null when no body is in view). One set per mount:
 * the state does not rewind when `enabled` goes back to true.
 */
export function usePoseTracker(videoRef: RefObject<HTMLVideoElement | null>, onFrame: (frame: PoseFrame | null, at: number) => void, enabled: boolean): TrackerState {
  const [state, setState] = useState<TrackerState>("requesting");
  const callback = useRef(onFrame);
  useEffect(() => {
    callback.current = onFrame;
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let raf = 0;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setState("nocamera");
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        if (!cancelled) setState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "nocamera");
        return;
      }
      const video = videoRef.current;
      if (cancelled || !video) return stream.getTracks().forEach((t) => t.stop());
      video.srcObject = stream;
      await video.play().catch(() => {});
      if (cancelled) return;
      setState("loading");

      let pose: PoseLandmarker;
      try {
        pose = await loadLandmarker();
      } catch {
        if (!cancelled) setState("error");
        return;
      }
      if (cancelled) return;
      setState("ready");

      let lastTime = -1;
      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (video.readyState < 2 || video.currentTime === lastTime) return;
        lastTime = video.currentTime;
        const at = performance.now();
        try {
          const result = pose.detectForVideo(video, at);
          const image = result.landmarks[0];
          const world = result.worldLandmarks[0];
          callback.current(image && world ? { image, world } : null, at);
        } catch {
          // A dropped frame is not worth ending the set for.
        }
      };
      raf = requestAnimationFrame(tick);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled, videoRef]);

  return state;
}
