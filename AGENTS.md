# TrackVision AGENTS.md

## Commands
- `npm install` — install dependencies (npm is canonical; a stray `bun.lock` also exists — don't mix package managers)
- `npm run dev` — Vite dev server on port 3000, host 0.0.0.0
- `npm run lint` — `tsc --noEmit` only; the sole verification step (no test suite, no ESLint despite README claims)
- `npm run build` — runs `scripts/verify-models.js` first and **fails** if `public/models/yolov8n.onnx` is missing, <100 KB (placeholder), or lacks the ONNX magic byte `0x08`
- `npm run check-models` — run that model gate standalone
- `node scripts/download-models.js` — optional full-size models into `public/models/`
- `npm run clean` uses `rm -rf dist`; fails on Windows cmd/PowerShell without POSIX rm

## Environment
- Fully client-side; no env vars required (README's `VITE_HF_TOKEN`/`VITE_MODEL_CDN` are not read by any code).
- Camera permission required for tracking; needs HTTPS or localhost.
- Dev server sets COOP `same-origin` + COEP `require-corp` headers (vite.config) — required for SharedArrayBuffer/WebGPU. Prod equivalents live in `netlify.toml` / `vercel.json`; serving `dist/` any other way needs them set manually.
- vite.config `optimizeDeps`: includes `onnxruntime-web`.

## Architecture Overview
- **Entry**: `App.tsx` renders `Landing` or `CommandCenter` based on `useVisionStore.mode` → `useVisionEngine.ts` (per-frame rAF loop) → detection + tracker workers.
- **Two vision modes** (`visionMode` in store): `fast` = YOLOv8n ONNX via `workers/yoloDetectionWorker.ts` (COCO-80 classes from `COCO_CLASSES` in `workerUtils.ts`); `open` = YOLO-World + CLIP text encoder (`/models/yoloworld.onnx`, `/models/clip_text_encoder.onnx`) via `workers/yoloWorldWorker.ts`.
- **Four active workers**, each spawned by a hook in `src/hooks/` with `{ type, payload, msgId }` postMessage protocol: yoloDetection, yoloWorld, reid (OSNet), tracker (ByteTrack).
- **ONNX session fallback cascade** is WebNN → WebGPU → WebGL → WASM (always last), not just WebGPU→WASM — see `createAcceleratedSession` in `workers/workerUtils.ts`.
- **Class-aware NMS runs on the main thread** after worker detection (`applyClassAwareNMS` in `useVisionEngine.ts`).
- **State**: two Zustand stores — `src/store.ts` (`useVisionStore`: tracking state, frames, telemetry) and `src/store/modelInitStore.ts` (`useModelInitStore`: boot/init overlay subsystem progress).

## Important Gotchas
- **ReID is initialized but not wired**: `useVisionEngine` destructures `extractBatch` from `useReIDWorker` but never calls it — detections carry no embeddings, so tracker matching uses only IoU + center distance + class cost (the no-embedding branch in `ByteTracker.matchDetections`).
- **Tracker thresholds differ from README**: engine initializes with `trackThresh = Math.min(confidenceThreshold, 0.4)` (hard cap at 0.4), `matchThresh = 0.7` (max matching cost), `maxTimeLost = 30`. Confirmation requires `hits >= 3` OR two detections scoring ≥ 0.7 (`confirmedHits >= 2`) — see `Track.update` in `lib/tracker.ts`.
- **Worker protocol**: init timeout 60 s; detect timeouts (8–10 s) resolve gracefully with empty results instead of throwing. Frame `ArrayBuffer`s are transferred per DETECT call (detached afterward — capture produces fresh buffers).
- **Camera**: frame processing waits for `video.readyState >= 2` and non-zero dimensions.
- **Label stabilization**: track class = majority vote over last 10 labels + EMA-smoothed bbox/score.
- **Replay mode**: `isReplay` pauses the live loop; `currentTime` scrubs stored `frames[]`.

## Key Conventions
- `BBox` = `[number, number, number, number]` (x, y, w, h) in pixel coordinates.
- Frames captured letterboxed at 640×640 via `useOffscreenCanvas.captureFrame` (returns buffer + scale/offset info used to map coords back to video space).
- History window: 5 minutes (`maxHistoryMs`); old frames pruned on each `addFrameData`.
- `cn()` utility (`src/lib/utils.ts`) wraps `clsx` + `tailwind-merge`.
