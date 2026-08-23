# TrackVision AGENTS.md

## Commands
- `npm install` — install dependencies (npm only; `package-lock.json` is the single lockfile)
- `npm run dev` — Vite dev server on port 3000, host 0.0.0.0
- `npm run dev:https` — same but with self-signed TLS (`@vitejs/plugin-basic-ssl`, env `TV_SSL=1`) — required for camera access from phones/other devices on the LAN (browsers block `getUserMedia` on plain HTTP non-localhost origins)
- `npm run lint` — `tsc --noEmit` only; the sole verification step (no ESLint despite README claims)
- `npm run test` — Vitest (49 unit tests across kalman/matching/tracker/workerUtils/store); `npm run test:watch` for watch mode; config in `vitest.config.ts` (node env, `src/**/*.test.ts`)
- `npm run build` — runs `scripts/verify-models.js` first and **fails** if `public/models/yolov8n.onnx` is missing, <100 KB (placeholder), or lacks the ONNX magic byte `0x08`
- `npm run check-models` — run that model gate standalone
- `node scripts/download-models.js` — full-size models into `public/models/` (only `yolov8n.onnx` ships real; other three are tiny placeholders)
- `npm run clean` — cross-platform (`scripts/clean.js`, works on Windows)

## Environment
- Fully client-side; no env vars required (README's `VITE_HF_TOKEN`/`VITE_MODEL_CDN` are not read by any code).
- Camera permission required for tracking; needs HTTPS or localhost.
- Dev server sets COOP `same-origin` + COEP `require-corp` headers (vite.config) — required for SharedArrayBuffer/WebGPU. Prod equivalents live in `netlify.toml` / `vercel.json`; serving `dist/` any other way needs them set manually.
- vite.config `optimizeDeps`: includes `onnxruntime-web`.

## Architecture Overview
- **Entry**: `App.tsx` renders `Landing` or `CommandCenter` based on `useVisionStore.mode` → `useVisionEngine.ts` (per-frame rAF loop) → detection + tracker workers.
- **Two vision modes** (`visionMode` in store): `fast` = YOLOv8n ONNX via `workers/yoloDetectionWorker.ts` (COCO-80 from `COCO_CLASSES` in `workerUtils.ts`); `open` = YOLO-World + CLIP — **fully functional** since the CLIP wiring: the export takes `images` + `text_features [1,C,512]`; `workers/clipTokenizer.ts` is a real CLIP BPE tokenizer (assets `public/models/clip-tokenizer/vocab.json` + `merges.txt`, git-tracked; ids verified identical vs Xenova reference — NFC + lowercase + `</w>` word-final suffix), prompts are `"a photo of a {concept}"`, local `clip_text_encoder.onnx` runs int64 input_ids on wasm, embeddings are L2-normalized and fed as the second input. Outputs are post-sigmoid `scores [1,N,C]` + XYXY `boxes [1,N,4]` in letterbox space, decoded by `postprocessWorld` (separate from fast-path `postprocess`). Placeholder gate remains; DETECT before concepts finish encoding returns a graceful error.
- **Four active workers**, each spawned by a hook in `src/hooks/` with `{ type, payload, msgId }` postMessage protocol: yoloDetection, yoloWorld, reid (OSNet), tracker (ByteTrack).
- **ONNX session fallback cascade** is WebNN → WebGPU → WebGL → WASM (always last), not just WebGPU→WASM — see `createAcceleratedSession` in `workers/workerUtils.ts`.
- **Class-aware NMS runs on the main thread**: `applyNMSWithClass` imported from `workers/workerUtils.ts` (type-only ort import; safe on main thread).
- **Shared types** live in `src/types.ts` (`BBox`, `Detection`, `CapturedFrame`); `lib/kalman|matching|tracker`, `workers/workerUtils`, `workers/trackerWorker` and `store.ts` re-export them.
- **State**: two Zustand stores — `src/store.ts` (`useVisionStore`: tracking state, frames, telemetry) and `src/store/modelInitStore.ts` (`useModelInitStore`: boot/init overlay subsystem progress).

## Important Gotchas
- **ReID IS wired now**: after NMS the engine slices a copy of the 640×640 pixels *before* detection transfers the frame buffer, maps video-space boxes into letterbox coords (`scale/offsetX/offsetY`), and calls `extractBatch`; embeddings attach only when non-zero and lengths match. Gated on `reidReady && !reidIsFallback` — placeholder/stub OSNet never feeds appearance matching. Tracker fuses via EMA α=0.3 + cosine cost weight 0.3.
- **Tracker thresholds**: engine initializes with `trackThresh = Math.min(confidenceThreshold, 0.4)` (hard cap at 0.4), single source `TRACKER_CONFIG` in `useVisionEngine.ts` (`matchThresh = 0.7`, `maxTimeLost = 30`). Confirmation requires `hits >= 3` OR two detections scoring ≥ 0.7 — see `Track.update` in `lib/tracker.ts`.
- **Worker protocol**: init timeout 60 s; detect timeouts (8–10 s) resolve gracefully with empty results instead of throwing. Frame `ArrayBuffer`s are transferred per DETECT call (detached afterward).
- **Camera**: frame processing waits for `video.readyState >= 2` and non-zero dimensions. Camera failures surface as a UI banner in `CameraHUD` (HTTPS hint on insecure origins) instead of console-only errors — phones on plain HTTP get a hard browser block, which is what made Vision/Analytics/History look "dead" on mobile.
- **Label stabilization**: track class = majority vote over last 10 labels + EMA-smoothed bbox/score.
- **Replay mode**: `isReplay` pauses the live loop; `currentTime` scrubs stored `frames[]`.
- **SW registers only in prod builds** (`import.meta.env.PROD` guard in `main.tsx`) so Vite HMR isn't intercepted.
- **Models on disk**: only `yolov8n.onnx` is git-tracked; the three optional models are `.gitignore`d (they total ~680 MB once downloaded). Downloader validates size + ONNX magic byte and skips valid cached files unless `--force`.

## Key Conventions
- `BBox` = `[number, number, number, number]` (x, y, w, h) in pixel coordinates.
- Frames captured letterboxed at 640×640 via `useOffscreenCanvas.captureFrame` (returns buffer + scale/offset info used to map coords back to video space).
- History window: 5 minutes (`maxHistoryMs`); old frames pruned on each `addFrameData`.
- `cn()` utility (`src/lib/utils.ts`) wraps `clsx` + `tailwind-merge`.
