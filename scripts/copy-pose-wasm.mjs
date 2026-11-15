// Copies the MediaPipe WebAssembly runtime next to the pose model in public/,
// so pose detection is served by the app itself and needs no network at runtime.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules/@mediapipe/tasks-vision/wasm");
const to = join(root, "public/pose/wasm");

mkdirSync(to, { recursive: true });
for (const file of ["vision_wasm_internal.js", "vision_wasm_internal.wasm"]) copyFileSync(join(from, file), join(to, file));
