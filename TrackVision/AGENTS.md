# TrackVision AGENTS.md

## Commands
- `npm install` — install dependencies
- `npm run dev` — starts Vite dev server on port 3000, host 0.0.0.0
- `npm run build` — produces production build
- `npm run lint` — runs `tsc --noEmit` (type-check only; no separate linter)
- `npm run preview` — serve the production build locally

## Environment
- Fully client-side — no API keys, servers, or environment variables required.
- `package.json` has `"type": "module"` — all imports are ES module style.
- Camera permission is required for tracking to work.

## Architecture Overview
- **Two vision modes** (in store): `fast` uses TF.js COCO-SSD (MobilenetV2) on main thread; `open` uses OwlViT via Web Worker (`src/workers/openVisionWorker.ts`) for zero-shot detection.
- **State**: Single Zustand store (`src/store.ts` → `useVisionStore`) holds all tracking state, UI config, and actions.
- **ByteTrack**: Custom TS port in `src/lib/tracker.ts` — splits detections by confidence (high ≥0.5, low >0.1), matches via IoU, requires `hits >= 3` to confirm tracks.
- **Entry points**: `App.tsx` → `CommandCenter.tsx` (main UI) → `useVisionEngine.ts` (per-frame loop) → `tracker.ts` / worker.

## Key Conventions
- **`BBox`** = `[number, number, number, number]` (x, y, w, h) in pixel coordinates.
- **`cn()`** utility (`src/lib/utils.ts`) wraps `clsx` + `tailwind-merge` for conditional classes.
- **Worker pattern**: `useOpenVision.ts` spawns worker, communicates via `postMessage`/`onmessage` with `msgId` for async responses.
- **Frame loop**: `requestAnimationFrame` in `useVisionEngine.ts`; skips frames when worker busy (`isDetectingRef`).
- **History window**: 5 minutes (`maxHistoryMs = 5 * 60 * 1000`); old frames pruned on each `addFrameData`.

## Important Gotchas
- **Camera**: Must grant permission; `video.readyState === HAVE_ENOUGH_DATA` required before processing.
- **WebGPU**: Worker attempts WebGPU first, falls back to WASM; check console for device used.
- **Track confirmation**: New tracks need `hits >= 3` before returned as active (see `ByteTracker.update` line 113).
- **Label stabilization**: Track class uses EMA smoothing + majority vote over last 10 labels.
- **Replay mode**: `isReplay` pauses live loop; `currentTime` scrubs through stored `frames[]`.
- **No tests**: Repo has no test suite; `lint` only runs TypeScript type-check.