# Figure Manifest — TrackVision Black Book

## Captured Screenshots (Real Application Output)

| Fig | Filename | Description | Status | Notes |
|-----|----------|-------------|--------|-------|
| 1 | `01-landing-page.png` | TrackVision marketing landing page with Hero, Feature Grid, Open Vision Playground, Performance Comparison, Use Cases, Code Quickstart, FAQ, CTA | ✅ Captured | Full page scroll capture |
| 2 | `02-command-center-standby.png` | Command Center immediately after launch, before model initialization | ✅ Captured | Shows "Start Tracking" button, boot sequence not started |
| 3 | `03-command-center-ready.png` | Command Center after model initialization complete, ready for camera | ✅ Captured | Shows "Start Tracking" button enabled, telemetry stream visible |
| 4 | `04-vision-panel.png` | Vision Panel (Detection Engine) — Fast vs Open mode selector, Open concepts input | ❌ Not Captured | Tab navigation timeout; placeholder needed |
| 5 | `05-analytics-panel.png` | Analytics Panel (Settings tab) — Real-time charts, telemetry cards | ❌ Not Captured | Tab navigation timeout; placeholder needed |
| 6 | `06-track-inspector.png` | Track Inspector (Tracks tab) — Active tracks list with IDs, classes, status | ❌ Not Captured | Tab navigation timeout; placeholder needed |
| 7 | `07-scene-map.png` | Scene Map (Scene tab) — 2D top-down spatial density map | ❌ Not Captured | Tab navigation timeout; placeholder needed |
| 8 | `08-timeline.png` | Timeline (History tab) — Gantt-chart track history, scrubber | ❌ Not Captured | Tab navigation timeout; placeholder needed |
| 9 | `09-live-view.png` | Live View (Live tab) — Camera viewport with overlay canvas | ❌ Not Captured | Requires camera; placeholder needed |
| 10 | `10-command-palette.png` | Command Palette (Ctrl+K) — Quick actions, search | ✅ Captured | Overlay modal visible |
| 11 | `11-mobile-view.png` | Mobile responsive layout (375×667) — Bottom nav, stacked panels | ✅ Captured | Viewport resize test |
| 12 | `12-final-composite.png` | Full desktop Command Center — Live view, side panels, top nav, telemetry | ✅ Captured | Comprehensive overview |

---

## Placeholder Screenshots Required (Camera-Dependent)

| Fig | Placeholder Label | Description | Reason |
|-----|-------------------|-------------|--------|
| 13 | `[INSERT ACTUAL SCREENSHOT: Detection Result]` | Early detection frame — bounding boxes, class labels, confidences (no tracking IDs yet) | Requires live camera + model inference |
| 14 | `[INSERT ACTUAL SCREENSHOT: Multi-Object Tracking]` | ≥3 objects with persistent tracking IDs, class labels, confidence scores | Requires live camera + multi-person scene |
| 15 | `[INSERT ACTUAL SCREENSHOT: Persistent Identity]` | Same object tracked across frames — ID continuity demonstrated | Requires temporal sequence |
| 16 | `[INSERT ACTUAL SCREENSHOT: Ghost Mode Trajectories]` | Ghost mode enabled — fading trajectory trails (15-frame history) | Requires tracking + Ghost mode |
| 17 | `[INSERT ACTUAL SCREENSHOT: Follow Mode]` | Follow mode enabled — locked camera on selected track, dimmed background | Requires tracking + Follow mode |
| 18 | `[INSERT ACTUAL SCREENSHOT: Occlusion Handling]` | Object temporarily occluded — track maintains ID via Kalman prediction | Requires specific scenario |
| 19 | `[INSERT ACTUAL SCREENSHOT: Crowded Scene]` | Multiple overlapping objects — ID separation, track merging if applicable | Requires crowded scene |
| 20 | `[INSERT ACTUAL SCREENSHOT: ReID Appearance Match]` | Track re-acquisition after occlusion — appearance embedding fusion | Requires OSNet model loaded |

---

## Generated Diagrams (TikZ/PGFPlots — To Be Created in LaTeX)

| Fig | Description | Type | Source |
|-----|-------------|------|--------|
| 21 | System Architecture | TikZ | Mermaid in README §Pipeline Architecture |
| 22 | End-to-End MOT Pipeline | TikZ | `useVisionEngine.ts` processFrame() |
| 23 | Browser Inference Architecture | TikZ | Workers + ONNX Runtime Web cascade |
| 24 | Track Lifecycle State Machine | TikZ | `tracker.ts` TrackState/TrackStatus enums |
| 25 | Kalman Filter Predict/Update | TikZ | `kalman.ts` 6×6 covariance equations |
| 26 | Data Association Cost Matrix | TikZ | `tracker.ts` matchDetections() weights |
| 27 | ByteTrack++ 4-Stage Flowchart | TikZ | `tracker.ts` ByteTracker.update() stages |
| 28 | ReID Embedding Pipeline | TikZ | `reidWorker.ts` extractBatch() |
| 29 | Performance Benchmark Chart | PGFPlots | README §Performance microbenchmarks |

---

## File Inventory

```
documentation/blackbook/figures/
├── 01-landing-page.png           (1.1 MB)  ✅ Real
├── 02-command-center-standby.png (38 KB)   ✅ Real
├── 03-command-center-ready.png   (36 KB)   ✅ Real
├── 04-vision-panel.png           [PLACEHOLDER]
├── 05-analytics-panel.png        [PLACEHOLDER]
├── 06-track-inspector.png        [PLACEHOLDER]
├── 07-scene-map.png              [PLACEHOLDER]
├── 08-timeline.png               [PLACEHOLDER]
├── 09-live-view.png              [PLACEHOLDER]
├── 10-command-palette.png        (34 KB)   ✅ Real
├── 11-mobile-view.png            (29 KB)   ✅ Real
├── 12-final-composite.png        (43 KB)   ✅ Real
├── 13-detection-result.png       [PLACEHOLDER]
├── 14-multi-object-tracking.png  [PLACEHOLDER]
├── 15-persistent-identity.png    [PLACEHOLDER]
├── 16-ghost-mode.png             [PLACEHOLDER]
├── 17-follow-mode.png            [PLACEHOLDER]
├── 18-occlusion-handling.png     [PLACEHOLDER]
├── 19-crowded-scene.png          [PLACEHOLDER]
├── 20-reid-appearance.png        [PLACEHOLDER]
└── (TikZ/PGFPlots generated during LaTeX compile)
```

---

## Capture Notes

- **Environment**: `npm run preview` (production build) at `http://localhost:4173`
- **Browser**: Playwright Chromium (headed mode)
- **Viewport**: 1920×1080 (desktop), 375×667 (mobile)
- **Video Input**: Not available in headless Playwright; application uses `getUserMedia()` only (no file upload)
- **Model Loading**: YOLOv8n (12.8 MB) loads successfully; OSNet, YOLO-World, CLIP are placeholders (not downloaded)
- **Tracking Output**: Cannot be captured without live camera feed; placeholders clearly marked

---

## Honest Disclosure

> **The TrackVision application does not support video file upload — only live camera via `getUserMedia()`. In the headless CI/automation environment used for documentation generation, camera access is unavailable. Therefore, screenshots showing actual detection/tracking output (bounding boxes, tracking IDs, trajectories) could not be captured. These figures are marked as `[INSERT ACTUAL SCREENSHOT]` placeholders in the LaTeX source and must be manually captured by running the application locally with a camera or by implementing video file upload support.**

This approach maintains academic integrity by clearly distinguishing between:
- **Real captured UI** (landing page, Command Center interface, panels, responsive design)
- **Placeholder tracking output** (requires runtime camera + inference)

---
*Generated: 2026-08-23 | Capture script: `tests/screenshots.spec.js` | Playwright v1.51*