# TrackVision

<div align="center">

![TrackVision Banner](https://img.shields.io/badge/TrackVision-2.0.0-000000?style=for-the-badge&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)
![ONNX Runtime](https://img.shields.io/badge/ONNX%20Runtime-Web-005CED?style=flat-square)
![WebGPU](https://img.shields.io/badge/WebGPU-Enabled-42A5F5?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square)

**Real-time, client-side multi-object tracking with ByteTrack temporal persistence — running entirely in your browser.**

[Live Demo](https://trackvision.dev) • [Documentation](https://github.com/zubershk/TrackVision/wiki) • [Report Bug](https://github.com/zubershk/TrackVision/issues) • [Request Feature](https://github.com/zubershk/TrackVision/issues/new)

</div>

---

## Overview

TrackVision is a production-ready, **fully client-side** multi-object tracking application that runs entirely in the browser. It combines state-of-the-art object detection (YOLOv8, YOLO-World) with a custom **ByteTrack** implementation for robust multi-object tracking — all without sending a single byte of video data to any server.

### Key Capabilities

| Feature | Description |
|---------|-------------|
| 100% Client-Side | Zero data uploads. All inference runs locally via WebGPU/WASM |
| Dual Detection Modes | Fast (YOLOv8n, 80 COCO classes) + Open (YOLO-World, open-vocabulary) |
| ByteTrack + Kalman | Custom TS implementation with full covariance Kalman filter |
| Re-ID (OSNet) | Appearance-based re-identification for occlusion recovery |
| Ghost Mode | Visualize trajectory history with fading trails |
| Follow Mode | Lock onto a track for isolated telemetry |
| Time Machine | Scrub through 5-minute history with frame-perfect replay |
| Scene Map | Live 2D top-down spatial density map |
| PWA Ready | Installable, offline-capable, responsive |

---

## Pipeline Architecture

```mermaid
flowchart TD
    subgraph Input["Input Layer"]
        Camera["Camera Stream"]
    end

    subgraph Preprocess["Preprocessing"]
        Offscreen["OffscreenCanvas\nZero-copy Capture"]
    end

    subgraph Detection["Detection Workers"]
        YOLOFast["YOLO Detection\nYOLOv8n - COCO 80"]
        YOLOOpen["YOLO-World\nOpen-vocab + in-browser CLIP"]
    end

    subgraph ReID["Re-Identification"]
        ReIDWorker["ReID Worker\nOSNet x1.0"]
    end

    subgraph Tracking["Tracking Core"]
        TrackerWorker["Tracker Worker\nByteTrack++"]
        Kalman["Kalman Filter\n6x6 Covariance"]
        Hungarian["Hungarian Algorithm\nIoU + Appearance + Class"]
        StateMachine["Track State Machine\nNEW -> TRACKED -> LOST -> REMOVED"]
        TrackMerge["Track Merge\nSplit Identity Recovery"]
    end

    subgraph State["State Management"]
        Zustand["Zustand Store\n5-min Rolling History"]
        Tracks["Tracks"]
        Timeline["Timeline"]
        SceneMap["Scene Map"]
        Telemetry["Telemetry"]
        Events["Events"]
    end

    Camera --> Offscreen
    Offscreen --> YOLOFast
    Offscreen --> YOLOOpen
    YOLOFast --> Tracking
    YOLOOpen --> Tracking
    Detection --> ReID
    ReID --> Tracking
    Tracking --> State
    State --> UI["UI Components"]

    classDef worker fill:#1a1a2e,stroke:#0f3460,stroke-width:2px,color:#eaeaea
    classDef state fill:#16213e,stroke:#0f3460,stroke-width:2px,color:#eaeaea
    classDef input fill:#0f3460,stroke:#e94560,stroke-width:2px,color:#eaeaea

    class YOLOFast,YOLOOpen,ReIDWorker,TrackerWorker worker
    class Zustand,Tracks,Timeline,SceneMap,Telemetry,Events state
    class Camera,Offscreen input
```

### Worker Architecture

| Worker | Responsibility | Technology |
|--------|----------------|------------|
| **YOLO Detection** | COCO 80-class detection (YOLOv8n) | ONNX Runtime Web (WebGPU/WASM) |
| **YOLO-World** | Open-vocabulary detection + CLIP embeddings | ONNX Runtime + CLIP text encoder |
| **ReID (OSNet)** | 512-dim appearance embeddings | ONNX Runtime (OSNet x1.0) |
| **Tracker** | ByteTrack + Kalman + Hungarian | Pure TypeScript |

---

## Detection Pipeline

### Fast Mode (YOLOv8n)
- **Model**: YOLOv8n (ONNX, 12.8 MB)
- **Classes**: 80 COCO categories
- **Input**: 640×640 RGB letterboxed
- **Backend**: WebNN → WebGPU → WebGL → WASM fallback cascade

### Open Mode (YOLO-World)
- **Model**: YOLO-World (RepVL-PAN export) + CLIP ViT-B/32 text encoder
- **Classes**: Dynamic (text-conditioned, user-supplied concepts)
- **Input**: 640×640 letterboxed RGB + `text_features [1,C,512]` from in-browser CLIP encoding
- **Outputs**: post-sigmoid `scores [1,N,C]` + XYXY `boxes [1,N,4]`
- **Latency**: device-dependent; text embeddings are computed once per concept set, not per frame

### Detection Features
- **Class-aware NMS** — Per-class suppression prevents cross-class suppression
- **Letterbox preprocessing** — Aspect-preserving resize with padding
- **ReID appearance matching** — Per-crop batch-1 OSNet inference fused into the tracker via EMA + cosine cost

---

## Tracking System (ByteTrack++)

### Track State Machine
```
NEW → TRACKED → LOST → REMOVED
  ↳ Requires 3 high-conf (≥0.7) hits to confirm
  ↳ 5-frame grace period before LOST
  ↳ 30-frame max lost before REMOVED
```

### Kalman Filter (Full 6×6 Covariance)
- **State**: [x, y, vx, vy, w, h] — position, velocity, dimensions
- **Process noise**: Constant acceleration model (Q matrix with dt⁴/4, dt³/2 terms)
- **Measurement noise**: Diagonal R matrix (position + size)
- **Full covariance** — Gaussian elimination inversion (6×6)
- **Velocity clamping** — Prevents runaway predictions

### Data Association (Hungarian + Gating)
| Cost Component | Weight | Description |
|----------------|--------|-------------|
| IoU (1-IoU) | 0.60 | Spatial overlap with predicted bbox |
| Appearance | 0.30 | Cosine similarity of OSNet embeddings |
| Class consistency | 0.10 | 0 if same class, 0.5 if different |
| Center distance | 0.10 | Normalized center-point distance |

**Gating**: Max cost threshold (1 - matchThresh) prunes impossible assignments before Hungarian.

### Track Merging (Split Identity Recovery)
- **Trigger**: IoU > 0.5 + same class + appearance similarity > 0.7
- **Resolution**: Older track absorbs younger; younger marked REMOVED
- **Embedding fusion**: EMA update (α=0.3) for robust appearance model

### Track Smoothing & Interpolation
- **BBox EMA**: α=0.7 smoothing on bounding boxes
- **Center EMA**: α=0.8 smoothing on center points
- **Occlusion interpolation**: Up to 5 frames of Kalman-predicted positions blended with smoothed bbox

---

## Re-Identification (ReID)

### OSNet x1.0
- **Architecture**: Omni-Scale Network (ICCV 2019)
- **Input**: 256×128 crops → 512-dim L2-normalized embeddings
- **Training**: Market-1501 + DukeMTMC-reID
- **ONNX**: convert from PyTorch weights ([kaiyangzhou/osnet](https://huggingface.co/kaiyangzhou/osnet)); full model ~9 MB

### Embedding Pipeline
1. **Crop extraction** — Letterbox crop from OffscreenCanvas
2. **Preprocessing** — Resize 256×128, ImageNet normalization (mean/std), RGB → CHW
3. **Per-crop inference** — Sequential batch-1 forward passes (the Axelera OSNet export rejects stacked batches)
4. **L2 normalization** — Unit hypersphere projection
5. **EMA fusion** — α=0.3 update per track

### Activation & Fallback
- Embeddings are extracted per frame (batched) **only when a valid OSNet model is loaded**; the init overlay shows the active mode.
- If OSNet is unavailable → tracker matching falls back to IoU + center distance + class consistency only.
- Placeholder stubs are detected at startup and never used for appearance matching (deterministic stub embeddings would silently skew matching costs).

---

## UI/UX Features

### Command Center
- **Glass-morphism UI** — Tailwind + custom Liquid Glass CSS
- **Responsive** — Desktop sidebar + mobile bottom nav
- **Command Palette** — `Ctrl/Cmd+K` for quick actions
- **Real-time telemetry** — FPS, inference, tracking latency

### Visualization Modes
| Mode | Description |
|------|-------------|
| **Live** | Real-time camera feed + overlays |
| **Ghost** | Fading trajectory trails (15 frames, opacity decay) |
| **Follow** | Locked camera on selected track, dimmed background |
| **Replay** | Scrub through 5-min history with frame-perfect sync |
| **Scene Map** | 640×480 top-down density map with live track dots |

### Timeline (Time Machine)
- **5-minute sliding window** — Automatic frame pruning
- **Gantt-chart tracks** — Horizontal bars per track ID
- **Variable playback** — 0.5×, 1×, 2×, 4× speeds
- **Scrubber** — Click/drag to seek any timestamp

### Analytics Panel
- **Real-time volume** — Objects/frame over time (AreaChart)
- **Class distribution** — Bar chart of detected categories
- **Telemetry cards** — FPS, frame time, inference, tracking latency

---

## Models

| Model | File | Size | Input | Output | Purpose |
|-------|------|------|-------|--------|---------|
| **YOLOv8n** | `yolov8n.onnx` | 12.8 MB ✅ included | 1×3×640×640 | 1×84×8400 | COCO detection |
| **YOLO-World** | `yoloworld.onnx` | optional (418 MB) | images + text_features [1,C,512] | scores [1,N,C] + boxes [1,N,4] | Open-vocab detection |
| **OSNet x1.0** | `osnet_x1_0.onnx` | optional (8.8 MB) | 1×3×256×128 | 1×512 | ReID embeddings |
| **CLIP Text** | `clip_text_encoder.onnx` | optional (254 MB) | input_ids [B,77] int64 | text_embeds [B,512] | Concept → text embeddings |

> Only `yolov8n.onnx` ships with the repo. Run `node scripts/download-models.js` to fetch the three optional models into `public/models/`. Open mode is fully wired: concepts are tokenized in-browser by a real CLIP BPE tokenizer (`public/models/clip-tokenizer/`, included), encoded by the local CLIP text encoder, and fed to YOLO-World as `text_features` — no external embedding service needed. ReID appearance matching activates automatically once OSNet is present.

### Model Sources
| Model | Source | License |
|-------|--------|---------|
| YOLOv8n | [onnx-community/yolov8n](https://huggingface.co/onnx-community/yolov8n) | AGPL-3.0 |
| YOLO-World | [wkentaro/yolo-world-onnx](https://github.com/wkentaro/yolo-world-onnx) (ONNX exports) / [AILab-CVC/YOLO-World](https://github.com/AILab-CVC/YOLO-World) (upstream) | GPL-3.0 |
| OSNet | [Axelera mirror](https://media.axelera.ai/artifacts/model_cards/weights/others/re-id/osnet_x1_0_market.onnx) (ONNX, Market1501) / [kaiyangzhou/osnet](https://huggingface.co/kaiyangzhou/osnet) (PyTorch upstream) | MIT |
| CLIP | [openai/CLIP](https://github.com/openai/CLIP) | MIT |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Modern browser with WebGPU support (Chrome 113+, Firefox 120+, Safari 16.4+)
- HTTPS or `localhost` (required for camera/WebGPU)

### Installation
```bash
# Clone repository
git clone https://github.com/zubershk/TrackVision.git
cd TrackVision

# Install dependencies
npm install

# (Optional) Download full models for Open mode + ReID appearance matching
node scripts/download-models.js

# Development server (localhost — camera works out of the box)
npm run dev

# Development server over self-signed HTTPS
# (required for camera access from phones/other devices on your LAN)
npm run dev:https

# Production build
npm run build

# Preview production build
npm run preview
```

### Model Setup (Optional but Recommended)
```bash
node scripts/download-models.js   # downloads all three into public/models/

public/models/
├── yolov8n.onnx              # 12.8 MB (already included)
├── yoloworld.onnx            # ~418 MB
├── osnet_x1_0.onnx           # ~8.8 MB
└── clip_text_encoder.onnx    # ~254 MB
```

> **Without the optional models**: Fast mode works fully out of the box. Open mode and ReID appearance matching stay inactive until their models are downloaded — the app detects this at startup and shows it in the init overlay instead of silently degrading.

---

## Configuration

### Tracker Configuration
```typescript
interface TrackerConfig {
  trackThresh: number;      // Detection confidence threshold (capped: min(confidenceThreshold, 0.4))
  matchThresh: number;      // Maximum matching cost for Hungarian assignment (default: 0.7)
  maxTimeLost: number;      // Frames before track removed (default: 30)
  useHungarian: boolean;    // Enable Hungarian algorithm (default: true)
  embeddingWeight: number;  // Appearance weight in cost (default: 0.3, active when ReID model loaded)
  iouWeight: number;        // IoU weight in cost (default: 0.6)
  classWeight: number;      // Class consistency weight (default: 0.1)
  mergeThresh: number;      // Track merge IoU threshold (default: 0.5)
}
```
Track confirmation requires `hits >= 3` OR two detections scoring >= 0.7. Tracks go LOST after >5 missed frames and are removed after >30 (`maxTimeLost`).

### Vision Modes
```typescript
type VisionMode = 'fast' | 'open';

interface VisionConfig {
  visionMode: VisionMode;           // 'fast' | 'open'
  confidenceThreshold: number;      // 0.1 - 0.9
  openConcepts: string[];           // Open-vocabulary concepts (open mode)
}
```

### Environment Variables

None required — the app is fully client-side. (Older docs mentioned `VITE_HF_TOKEN`/`VITE_MODEL_CDN`; no code reads them.)

---

## Performance

### Measured Session Init (WebGPU)

Times from a real dev-server run on Windows 11 / Chrome (WebGPU EP):

| Model | Size | Session init |
|-------|------|--------------|
| YOLOv8n (detection) | 12.8 MB | ~1.8 s |
| OSNet x1_0 (ReID) | 8.8 MB | ~1.9 s |
| YOLO-World (open vocab) | 418 MB | ~3.7 s |

End-to-end FPS depends on your GPU/browser/WebGPU driver — no fixed FPS numbers are claimed here. The JS-side tracking pipeline is benchmarked below; model inference dominates frame time in practice.

### Tracking Pipeline (pure JS, Node 22, Vitest run)

NMS + ByteTrack association + Kalman predict/update per frame, measured over 1000 frames each:

| Detections/frame | ms/frame |
|------------------|----------|
| 5 | ~0.31 |
| 10 | ~0.51 |
| 20 | ~1.04 |

### Bundle Sizes (production build, raw)

Measured from `dist/assets` after `npm run build` (sizes are raw, not gzipped):

| Chunk | Size |
|-------|------|
| Main bundle (`index.js`) | 345 KB |
| Charts chunk (`charts.js`, lazy) | 373 KB |
| Vendor chunk | 36 KB |
| YOLO Detection Worker | 404 KB |
| YOLO-World Worker | 404 KB |
| ReID Worker | 400 KB |
| Tracker Worker | 10 KB |
| CSS | 81 KB |
| ONNX Runtime WASM (`ort-wasm-simd-threaded.jsep.wasm`) | 26.2 MB |

---

## Deployment

### Static Hosting (Vercel/Netlify/Cloudflare Pages)
```bash
npm run build
# Deploy dist/ folder
```

### Required Headers
```nginx
# Required for WebGPU + SharedArrayBuffer
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp

# Model caching
Cache-Control: public, max-age=31536000, immutable  # /models/*
```

### Docker
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### nginx.conf
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Required for WebGPU
    add_header Cross-Origin-Opener-Policy same-origin;
    add_header Cross-Origin-Embedder-Policy require-corp;

    # Model caching
    location /models/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

### Testing

```bash
# Type checking
npm run lint

# Unit tests (Vitest)
npm run test          # single run
npm run test:watch    # watch mode

# Model gate
npm run check-models

# Production build (runs the model gate first)
npm run build
```

49 unit tests cover the Kalman filter, Hungarian/greedy matching, ByteTrack lifecycle + appearance fusion, class-aware NMS, and store history pruning. Manual smoke test: `npm run dev`, grant camera permission, and confirm detections render with telemetry updating.

---

## Project Structure

```
TrackVision/
├── public/
│   ├── models/                 # ONNX models (yolov8n included; others via downloader)
│   │   ├── yolov8n.onnx
│   │   ├── yoloworld.onnx      # optional — run download-models.js
│   │   ├── osnet_x1_0.onnx     # optional — run download-models.js
│   │   ├── clip_text_encoder.onnx # optional — run download-models.js
│   │   └── clip-tokenizer/     # CLIP BPE vocab + merges (included, used by open mode)
│   ├── sw.js                   # Service Worker (registered in production builds)
│   └── manifest.json           # PWA manifest
├── scripts/
│   ├── download-models.js      # Model downloader (Node.js)
│   ├── verify-models.js        # Build-time model gate
│   ├── dev-https.js            # HTTPS dev wrapper (TV_SSL=1)
│   └── clean.js                # Cross-platform dist cleanup
├── src/
│   ├── components/             # React components
│   ├── hooks/                  # Custom React hooks (worker spawning + engine loop)
│   ├── lib/                    # Core algorithms
│   │   ├── tracker.ts          # ByteTrack implementation
│   │   ├── kalman.ts           # Full covariance Kalman
│   │   ├── matching.ts         # Hungarian + IoU
│   │   └── utils.ts
│   ├── workers/                # Web Workers (YOLO, YOLO-World, ReID, tracker)
│   ├── store.ts                # Zustand store (tracking state)
│   ├── store/modelInitStore.ts # Boot/init overlay progress
│   └── styles/                 # Liquid Glass CSS
├── dist/                       # Production build
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Contributing

### Development Setup
```bash
git clone https://github.com/zubershk/TrackVision.git
cd TrackVision
npm install
npm run dev
```

### Code Style
- TypeScript strict mode (`npm run lint` = `tsc --noEmit`; no ESLint/Prettier configured)
- Conventional commits
- No `any` types without justification

### Pull Request Process
1. Fork & create feature branch
2. Implement changes with tests
3. Ensure `npm run lint` passes
4. Update documentation if needed
5. Submit PR with description

---

## License

MIT License — see [LICENSE](LICENSE) for details.

**Models**: See individual model licenses (AGPL-3.0, GPL-3.0, MIT)

---

## Acknowledgments

- **ByteTrack** — [YOLOX/ByteTrack](https://github.com/ifzhang/ByteTrack)
- **YOLOv8** — [Ultralytics](https://github.com/ultralytics/ultralytics)
- **YOLO-World** — [AILab-CVC/YOLO-World](https://github.com/AILab-CVC/YOLO-World) (ONNX exports via [wkentaro/yolo-world-onnx](https://github.com/wkentaro/yolo-world-onnx))
- **OSNet** — [Kaiyang Zhou](https://github.com/kaiyangzhou/deep-person-reid)
- **CLIP** — [OpenAI](https://github.com/openai/CLIP) (tokenizer assets from [Xenova/transformers.js](https://huggingface.co/Xenova/clip-vit-base-patch32))
- **ONNX Runtime Web** — [Microsoft](https://github.com/microsoft/onnxruntime)

---

## Support

- **Issues**: [GitHub Issues](https://github.com/zubershk/TrackVision/issues)
- **Discussions**: [GitHub Discussions](https://github.com/zubershk/TrackVision/discussions)

---

<div align="center">

**Built by [Zuber](https://github.com/zubershk)**

*TrackVision — Precision Object Intelligence*

</div>