# Project Truth — TrackVision

## Project Title
TrackVision — Real-time Client-Side Multiple Object Tracking

## Actual Objective
To develop and evaluate a real-time, fully client-side multiple object tracking system capable of detecting, associating, and maintaining object identities across consecutive video frames directly within a web browser, using browser-based ONNX Runtime Web inference with hardware acceleration (WebNN → WebGPU → WebGL → WASM cascade).

---

## Actual Technology Stack

| Component | Technology | Version | Evidence |
|-----------|------------|---------|----------|
| Language | TypeScript | 5.8.2 | `package.json`, `tsconfig.json` |
| Frontend Framework | React | 19.0.1 | `package.json`, `src/main.tsx` |
| Build Tool | Vite | 6.2.3 | `package.json`, `vite.config.ts` |
| State Management | Zustand | 5.0.15 | `package.json`, `src/store.ts` |
| Styling | Tailwind CSS | 4.1.14 | `package.json`, `src/index.css` |
| Inference Runtime | ONNX Runtime Web | 1.19.0 | `package.json`, workers |
| Charts | Recharts | 3.10.1 | `package.json`, `AnalyticsPanel.tsx` |
| Testing | Vitest | 4.1.11 | `package.json`, `vitest.config.ts` |
| Linting | TypeScript (tsc --noEmit) | 5.8.2 | `package.json` scripts |
| Icons | Lucide React | 0.546.0 | `package.json` |

---

## Actual Object Detection Methods

### Fast Mode (Default)
- **Model**: YOLOv8n (nano) exported to ONNX
- **Classes**: 80 COCO categories (fixed vocabulary)
- **Input**: 640×640 RGB, letterboxed (aspect-preserving with padding)
- **Model File**: `public/models/yolov8n.onnx` (12.8 MB, git-tracked)
- **Worker**: `src/workers/yoloDetectionWorker.ts`
- **Preprocessing**: Planar RGBA → float32 CHW, 1/255 normalization
- **Postprocessing**: Handles both transposed `[1, 84, 8400]` and non-transposed outputs; sigmoid calibration; class-aware NMS (IoU 0.45)
- **Execution Providers**: WebNN → WebGPU → WebGL → WASM (cascade via `createAcceleratedSession` in `workerUtils.ts`)
- **Confidence Threshold**: User-adjustable (default 0.5), capped at 0.4 for tracker

### Open-Vocabulary Mode
- **Model**: YOLO-World (RepVL-PAN export) + CLIP ViT-B/32 text encoder
- **Classes**: Dynamic — user-supplied text concepts (comma-separated)
- **Input**: 640×640 letterboxed RGB + `text_features [1, C, 512]` from in-browser CLIP encoding
- **Model Files**: 
  - `public/models/yoloworld.onnx` (~418 MB, optional, downloaded via script)
  - `public/models/clip_text_encoder.onnx` (~254 MB, optional, downloaded via script)
- **Worker**: `src/workers/yoloWorldWorker.ts`
- **Tokenizer**: Real CLIP BPE tokenizer (`src/workers/clipTokenizer.ts`) with vocab/merges from `public/models/clip-tokenizer/` (git-tracked)
- **Text Encoding**: Prompts formatted as `"a photo of a {concept}"`, tokenized to int64 `[B, 77]`, encoded via CLIP text encoder (WASM), L2-normalized
- **Outputs**: Post-sigmoid `scores [1, N, C]` + XYXY `boxes [1, N, 4]` in letterbox space
- **Lazy Loading**: CLIP model loads on first concept set; embeddings computed once per concept set
- **Fallback**: Placeholder gate returns graceful error if models not downloaded

---

## Actual Tracking Method

### Algorithm: Custom ByteTrack++ (TypeScript Implementation)
- **Location**: `src/lib/tracker.ts` (main thread) + `src/workers/trackerWorker.ts` (Web Worker)
- **Architecture**: Tracking-by-detection with Kalman filtering + Hungarian assignment

### Kalman Filter (Full 6×6 Covariance)
- **State Vector**: `[x, y, vx, vy, w, h]` — center position, velocity, dimensions
- **Process Noise Matrix (Q)**: Constant acceleration model with `dt⁴/4`, `dt³/2` terms
- **Measurement Noise (R)**: Diagonal matrix (position + size)
- **Covariance Inversion**: Gaussian elimination (6×6) in `KalmanFilter.matrixInverse()`
- **Velocity Clamping**: ±1000 px/frame to prevent runaway predictions
- **Timestep (dt)**: 1/30 s (assumed 30 FPS)

### Track Lifecycle (Verified States)
```
TENTATIVE → CONFIRMED → LOST → REMOVED
```
- **TENTATIVE → CONFIRMED**: `hits >= 3` OR `confirmedHits >= 2` (detections with score ≥ 0.7)
- **CONFIRMED → LOST**: `timeSinceUpdate > 5` frames
- **LOST → REMOVED**: `timeSinceUpdate > 30` frames (`maxTimeLost`)
- **Recovery**: LOST → TRACKED if re-associated within `maxTimeLost`

### Data Association (Hungarian Algorithm)
- **Cost Components** (verified in `ByteTracker.matchDetections()`):
  | Component | Weight | Formula |
  |-----------|--------|---------|
  | IoU | 0.60 | `1 - IoU(predicted_bbox, detection_bbox)` |
  | Appearance | 0.30 | `1 - max(0, cosine_similarity(track_emb, det_emb))` |
  | Class Consistency | 0.10 | `0` if same class, `0.4` if different |
  | Center Distance | 0.10 | `min(1, center_dist / (max_dim * 2))` |
- **Gating**: Max cost threshold = `1 - matchThresh` (default `matchThresh = 0.7` → max cost 0.3)
- **Algorithm**: Hungarian (Kuhn-Munkres) with square padding; fallback to greedy if disabled
- **Two-Stage Matching**: High-score detections (≥ trackThresh) matched first, then low-score (0.1–trackThresh)

### ReID Appearance Fusion
- **Model**: OSNet x1.0 (Omni-Scale Network, ICCV 2019)
- **Input**: 256×128 crops → 512-dim L2-normalized embeddings
- **Model File**: `public/models/osnet_x1_0.onnx` (~8.8 MB, optional)
- **Worker**: `src/workers/reidWorker.ts`
- **Preprocessing**: Resize 256×128, ImageNet mean/std normalization, RGB → CHW
- **Inference**: Sequential batch-1 forward passes (Axelera export rejects stacked batches)
- **Fusion**: EMA update with α=0.3 per track (`Track.updateEmbedding()`)
- **Activation Gate**: Only when valid OSNet model loaded (`reidReady && !reidIsFallback`)
- **Fallback**: IoU + center distance + class consistency only when OSNet unavailable

### Track Merging (Split Identity Recovery)
- **Trigger**: IoU > 0.5 + same class + appearance similarity > 0.7
- **Resolution**: Older track absorbs younger; younger marked REMOVED
- **Embedding Fusion**: EMA update (α=0.3) for robust appearance model

### Smoothing & Interpolation
- **BBox EMA**: α=0.7
- **Center EMA**: α=0.8
- **Occlusion Interpolation**: Up to 5 frames of Kalman-predicted positions blended with smoothed bbox

### Tracker Configuration (from `useVisionEngine.ts` `TRACKER_CONFIG`)
```typescript
{
  matchThresh: 0.7,
  maxTimeLost: 30,
  useHungarian: true,
  embeddingWeight: 0.3,
  iouWeight: 0.6,
  classWeight: 0.1,
  trackThresh: Math.min(confidenceThreshold, 0.4)  // hard cap at 0.4
}
```

---

## Actual Dataset

| Parameter | Value | Evidence |
|-----------|-------|----------|
| **Formal Benchmark Dataset** | **None used** | No dataset files in repo; no evaluation scripts against MOTChallenge, KITTI, etc. |
| **Primary Input** | Live camera stream via `getUserMedia()` | `CameraHUD.tsx`, `useOffscreenCanvas.ts` |
| **Secondary Input** | User-provided video files (drag-drop) | `CameraHUD.tsx` file input |
| **Video Format** | Browser-supported (MP4, WebM, etc.) | HTML5 video element |
| **Resolution** | Variable (camera/user); processed at 640×640 letterboxed | `useOffscreenCanvas.captureFrame(640, 640)` |
| **FPS** | Variable (camera typically 30); tracker assumes dt=1/30 | `KalmanFilter` constructor default |
| **Object Classes** | COCO-80 (fast mode) / User-defined (open mode) | `COCO_CLASSES` in `workerUtils.ts` |
| **Annotations** | None (no ground truth) | N/A |
| **Train/Test Split** | N/A | N/A |

**Key Limitation**: No formal benchmark dataset → no standardized quantitative MOT evaluation (MOTA, IDF1, HOTA) possible without external data.

---

## Actual Input

| Source | Method | Processing |
|--------|--------|------------|
| Camera | `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` | `CameraHUD.tsx` |
| Video File | `<input type="file" accept="video/*">` → `URL.createObjectURL()` | `CameraHUD.tsx` |
| Frame Capture | `OffscreenCanvas` (640×640) with `drawImage()` | `useOffscreenCanvas.ts` `captureFrame()` |
| Letterboxing | Aspect-preserving resize + padding; returns scale, offsetX, offsetY | `useOffscreenCanvas.ts` |
| Buffer Transfer | `ArrayBuffer` transferred to workers (detached) | Workers receive via `postMessage` |

---

## Actual Output

| Output | Format | Location |
|--------|--------|----------|
| Bounding Boxes | `[x, y, w, h]` in original video pixels | `Track.getDisplayBBox()` |
| Tracking IDs | Integer (monotonically increasing) | `Track.id` |
| Class Labels | String (COCO class or user concept) | `Track.className` (majority vote over 10-frame history) |
| Confidence | Float (0–1, EMA-smoothed) | `Track.score` |
| Trajectories | Center point history (max 300 points) | `TrackMeta.history` |
| Track State | Enum: TENTATIVE / CONFIRMED / DELETED | `Track.state` |
| Track Status | Enum: NEW / TRACKED / LOST / REMOVED | `Track.status` |
| Processed Video | Canvas overlay (real-time) | `CommandCenter.tsx` → canvas rendering |
| Rolling History | 5-minute sliding window (auto-pruned) | `useVisionStore.addFrameData()` `maxHistoryMs = 5*60*1000` |
| Telemetry | FPS, inference/preprocess/postprocess/tracking/render/frame ms, execution provider | `Telemetry` interface in `store.ts` |
| Events | Track NEW/LOST/REACQUIRED + SYSTEM | `AppEvent` in `store.ts` |

---

## Actual Tracking Pipeline (Frame-by-Frame)

```
1. Video Frame → getUserMedia() / video file
2. OffscreenCanvas.drawImage() → 640×640 letterboxed
3. captureFrame() → { buffer, data, width, height, scale, offsetX, offsetY }
4. Vision Mode Branch:
   a) FAST: yoloDetectionWorker.DETECT(frame, confThreshold)
   b) OPEN: yoloWorldWorker.DETECT(frame, confThreshold) + CLIP text_features
5. Detection Results → class-aware NMS (applyNMSWithClass, IoU 0.45)
6. ReID (if ready & not fallback):
   - Map video-space boxes → letterbox coords
   - extractBatch(imageData, boxes) → 512-dim embeddings per detection
   - Attach non-zero embeddings to detections
7. Tracker UPDATE(detections):
   - Predict all tracks (Kalman)
   - Stage 1: Match high-score dets (≥ trackThresh) with all tracks
   - Stage 2: Match low-score dets (0.1–trackThresh) with remaining tracks
   - Stage 3: Create new tracks for unmatched high-score dets
   - Stage 4: Mark unmatched tracks as missed
   - Merge similar tracks (IoU > 0.5 + same class + app > 0.7)
   - Filter deleted tracks
8. Store Results:
   - addFrameData({ timestamp, tracks }, activeTracksInfo, telemetry)
   - Update track metadata (history, distance, speed, bearing)
   - Prune frames older than 5 minutes
9. Render: Canvas overlay with boxes, IDs, trails (Ghost mode), Scene Map
10. Loop: requestAnimationFrame(processFrame)
```

---

## Actual Evaluation

| Aspect | Status | Details |
|--------|--------|---------|
| **Standardized MOT Metrics (MOTA, IDF1, HOTA)** | **NOT COMPUTED** | No benchmark dataset; no evaluation pipeline |
| **Unit Tests** | **49 PASSING** | Vitest: Kalman (9), Matching (8), Tracker (20), WorkerUtils (7), Store (5) |
| **Pipeline Microbenchmarks** | **MEASURED** | NMS + ByteTrack: 0.31 ms (5 dets), 0.51 ms (10 dets), 1.04 ms (20 dets) |
| **Session Init Times** | **MEASURED** | YOLOv8n ~1.8s, OSNet ~1.9s, YOLO-World ~3.7s (WebGPU, Windows 11/Chrome) |
| **Bundle Sizes** | **MEASURED** | Main 345 KB, Charts 373 KB, Workers ~400 KB each, ONNX WASM 26.2 MB |
| **Qualitative Testing** | **MANUAL** | Camera permission → detections render → IDs persist → telemetry updates |
| **Type Checking** | **PASSING** | `npm run lint` = `tsc --noEmit` |

---

## Actual Accuracy

| Metric | Value | Basis |
|--------|-------|-------|
| **MOTA** | Not computed | No ground truth |
| **IDF1** | Not computed | No ground truth |
| **HOTA** | Not computed | No ground truth |
| **ID Switches** | Not measured | No ground truth |
| **Detection mAP** | Not computed | No COCO evaluation run |
| **Pipeline Latency (JS only)** | 0.31–1.04 ms/frame | Vitest benchmarks (Node 22) |
| **End-to-End FPS** | Device-dependent | Not claimed; model inference dominates |

**Honest Statement**: The current implementation does not compute standardized quantitative MOT accuracy metrics. Evaluation consists of: (1) 49 passing unit tests validating algorithmic correctness, (2) JS-side pipeline microbenchmarks, (3) session initialization timing, (4) bundle size measurements, (5) qualitative manual verification of identity continuity and responsiveness.

---

## Actual FPS

| Context | FPS | Notes |
|---------|-----|-------|
| **Tracker Pipeline (JS only)** | ~960–3200 FPS equivalent | 0.31–1.04 ms/frame at 5–20 detections (Node benchmark) |
| **Full Inference + Tracking** | Device-dependent | Model inference dominates; no fixed claim |
| **Session Init** | N/A | One-time model loading (1.8–3.7s per model) |

---

## Actual Experiments

| Experiment | Status | Evidence |
|------------|--------|----------|
| Kalman Filter correctness | ✅ Verified | `kalman.test.ts` — predict/update, covariance, inversion |
| Hungarian Algorithm correctness | ✅ Verified | `matching.test.ts` — assignment, gating, edge cases |
| ByteTrack Lifecycle | ✅ Verified | `tracker.test.ts` — TENTATIVE→CONFIRMED→LOST→REMOVED, occlusion recovery, ID persistence |
| Appearance Fusion | ✅ Verified | `tracker.test.ts` — EMA blending, crossing disambiguation |
| Class-aware NMS | ✅ Verified | `workerUtils.test.ts` — per-class suppression |
| Store History Pruning | ✅ Verified | `store.test.ts` — 5-min window, frame pruning |
| Model Gate (build) | ✅ Verified | `verify-models.js` — size + ONNX magic byte validation |
| Model Downloader | ✅ Verified | `download-models.js` — multi-source with fallback |

---

## Implemented Components

| Component | Status | Location |
|-----------|--------|----------|
| YOLOv8n Detection Worker | ✅ Complete | `src/workers/yoloDetectionWorker.ts` |
| YOLO-World + CLIP Worker | ✅ Complete | `src/workers/yoloWorldWorker.ts` |
| CLIP BPE Tokenizer | ✅ Complete | `src/workers/clipTokenizer.ts` |
| OSNet ReID Worker | ✅ Complete | `src/workers/reidWorker.ts` |
| ByteTrack++ Tracker (Main) | ✅ Complete | `src/lib/tracker.ts` |
| ByteTrack++ Tracker (Worker) | ✅ Complete | `src/workers/trackerWorker.ts` |
| Kalman Filter (6×6 Covariance) | ✅ Complete | `src/lib/kalman.ts` |
| Hungarian + Greedy Matching | ✅ Complete | `src/lib/matching.ts` |
| Class-aware NMS | ✅ Complete | `src/workers/workerUtils.ts` |
| Vision Engine (rAF Loop) | ✅ Complete | `src/hooks/useVisionEngine.ts` |
| OffscreenCanvas Capture | ✅ Complete | `src/hooks/useOffscreenCanvas.ts` |
| Zustand Store (Tracking State) | ✅ Complete | `src/store.ts` |
| Model Init Store (Boot Progress) | ✅ Complete | `src/store/modelInitStore.ts` |
| Command Center UI | ✅ Complete | `src/components/CommandCenter.tsx` |
| Landing Page | ✅ Complete | `src/components/Landing.tsx` + landing components |
| Camera HUD | ✅ Complete | `src/components/CameraHUD.tsx` |
| Analytics Panel | ✅ Complete | `src/components/AnalyticsPanel.tsx` |
| Timeline (Time Machine) | ✅ Complete | `src/components/Timeline.tsx` |
| Track Inspector | ✅ Complete | `src/components/TrackInspector.tsx` |
| Vision Panel (Mode Switch) | ✅ Complete | `src/components/VisionPanel.tsx` |
| PWA (Service Worker + Manifest) | ✅ Complete | `public/sw.js`, `public/manifest.json` |
| HTTPS Dev Server | ✅ Complete | `scripts/dev-https.js`, `@vitejs/plugin-basic-ssl` |
| Model Downloader | ✅ Complete | `scripts/download-models.js` |
| Build-time Model Gate | ✅ Complete | `scripts/verify-models.js` |
| Unit Tests (49) | ✅ Complete | `src/**/*.test.ts` |
| TypeScript Strict Mode | ✅ Complete | `tsconfig.json`, `npm run lint` |

---

## Partially Implemented Components

| Component | Status | Gap |
|-----------|--------|-----|
| Open-Vocabulary Mode | ⚠️ Model-dependent | Requires 418 MB + 254 MB downloads; placeholder gate blocks if missing |
| ReID Appearance Matching | ⚠️ Model-dependent | Requires 8.8 MB OSNet download; fallback to IoU-only if missing |
| MOT Metrics Evaluation | ❌ Not implemented | No benchmark dataset, no evaluation pipeline |
| Automated E2E Tests | ❌ Not implemented | Only unit tests; no Playwright/Cypress |
| Video Export | ❌ Not implemented | Live canvas only; no MP4/WebM output |
| Multi-camera Support | ❌ Not implemented | Single video source only |

---

## Theoretical Components (Documented but Not Implemented)

| Component | Reference | Implementation Status |
|-----------|-----------|----------------------|
| BoT-SORT | Literature review only | Not implemented |
| Deep SORT | Literature review only | Not implemented |
| StrongSORT | Literature review only | Not implemented |
| OC-SORT | Literature review only | Not implemented |
| MOTA/IDF1/HOTA Computation | Future work | Not implemented |

---

## Missing Evidence

| Evidence | Required For | Status |
|----------|--------------|--------|
| Benchmark Dataset (MOT17, KITTI, etc.) | MOTA/IDF1/HOTA | ❌ Missing |
| Ground Truth Annotations | Quantitative Accuracy | ❌ Missing |
| Automated Evaluation Pipeline | Standardized Metrics | ❌ Missing |
| Output Video Recording | Demonstration | ❌ Missing |
| Real Screenshots | Section 8 of Report | ⚠️ To be captured (Phase 4) |
| Cross-browser WebGPU Compatibility | Deployment Verification | ⚠️ Partial (Chrome/Edge/Firefox tested) |
| Mobile Camera Access (HTTPS) | Deployment Verification | ⚠️ Verified via `dev:https` |

---

## Unverified Claims (from README/Marketing)

| Claim | Verification Status | Notes |
|-------|---------------------|-------|
| "Production-ready" | ⚠️ Subjective | No SLA, no load testing, no error budgets |
| "Real-time" | ✅ Qualified | Browser-dependent; model inference dominates |
| "Zero data uploads" | ✅ Verified | Fully client-side; no network requests for inference |
| "PWA Ready" | ✅ Verified | SW + Manifest + COOP/COEP headers |
| "Ghost Mode / Follow Mode / Time Machine" | ✅ Verified | UI components exist and functional |
| "Scene Map" | ✅ Verified | `SceneMap` in store + visualization |
| 49 Tests "cover" algorithms | ✅ Verified | Vitest output confirms 49 passing |

---

## Confidence Assessment

| Category | Confidence | Basis |
|----------|------------|-------|
| Detection Architecture | HIGH | Direct code inspection of both workers |
| Tracking Algorithm | HIGH | Full `tracker.ts` + `trackerWorker.ts` + tests |
| ReID Pipeline | HIGH | `reidWorker.ts` + `tracker.ts` embedding fusion |
| Kalman Filter | HIGH | `kalman.ts` + 9 passing tests |
| Hungarian Matching | HIGH | `matching.ts` + 8 passing tests |
| Model Loading/Providers | HIGH | `workerUtils.ts` `createAcceleratedSession` |
| Dataset Status | HIGH | No dataset files found in entire repo |
| MOT Metrics Status | HIGH | No evaluation scripts, no ground truth |
| Deployment Config | HIGH | `netlify.toml`, `vercel.json`, `nginx.conf` present |
| Test Coverage | HIGH | 49 tests listed in `package.json` + vitest output |

---
*This document is the single source of truth for all documentation generation. Every claim in the final report must be traceable to an entry here with implementation location and evidence.*