# Project Audit — TrackVision Unit 2 Mini Project

Comprehensive technical audit identifying strengths, gaps, risks, and recommendations before submission.

---

## Strengths

| Area | Details |
|------|---------|
| **Core Algorithms** | Custom ByteTrack++ with full 6×6 covariance Kalman, Hungarian assignment, track lifecycle (TENTATIVE→CONFIRMED→LOST→REMOVED), ReID fusion (EMA α=0.3), track merging, EMA smoothing — all in TypeScript |
| **Dual Detection Paths** | Fast (YOLOv8n, COCO-80) + Open (YOLO-World + CLIP ViT-B/32) with real in-browser CLIP BPE tokenizer |
| **Hardware Acceleration** | WebNN → WebGPU → WebGL → WASM cascade via `createAcceleratedSession`; not just WebGPU→WASM |
| **Unit Test Coverage** | 49 Vitest tests: Kalman (9), Matching (8), Tracker lifecycle+appearance (20), WorkerUtils (7), Store (5) — all passing |
| **Engineering Quality** | TypeScript strict mode, zero `any` without justification, conventional commits, worker architecture with message protocols |
| **Deployment Ready** | Netlify/Vercel/CF Pages configs with COOP/COEP headers; Docker + nginx; HTTPS dev server for mobile camera access |
| **Model Management** | Build-time gate (`verify-models.js`), downloader with multi-source fallback + size/magic-byte validation |
| **Telemetry** | FPS, latency breakdown (preprocess/inference/postprocess/tracking/render), execution provider, 5-min rolling history |
| **UI/UX** | Glass-morphism Command Center, Ghost/Follow/Replay/Scene Map modes, Timeline (Gantt), Analytics (Recharts), Command Palette |
| **PWA** | Service Worker (prod-only registration), Web App Manifest, offline-capable |
| **Code Organization** | Clean separation: workers, hooks, lib, store, components; shared types in `types.ts` |

---

## Missing Evidence

| Evidence | Impact | Resolution |
|----------|--------|------------|
| **Screenshots (9 required)** | Blocks Section 8 of report | Phase 4: Playwright capture from running app |
| **Benchmark Dataset** | Blocks MOTA/IDF1/HOTA | Document honestly: "No formal benchmark dataset used" |
| **MOT Metrics Pipeline** | Blocks quantitative accuracy | Add Future Work subsection; do not fabricate |
| **PPT Presentation** | Required deliverable | Phase 8: Generate via python-pptx |
| **Deployment Verification** | Required for "Working Deployment" | Phase 9: Test Netlify + local verification script |
| **Output Video Export** | Not required but notable gap | Document as limitation / future work |
| **Cross-browser Test Results** | Deployment risk | Test Chrome/Edge/Firefox/Safari; document results |

---

## Missing Measurements

| Measurement | Current Status | Required for Report |
|-------------|----------------|---------------------|
| MOTA | ❌ Not computed | State "not computed" |
| IDF1 | ❌ Not computed | State "not computed" |
| HOTA | ❌ Not computed | State "not computed" |
| ID Switches | ❌ Not measured | State "not measured" |
| False Positives/Negatives | ❌ Not measured | State "not measured" |
| Detection mAP (COCO) | ❌ Not computed | State "not computed" |
| End-to-End FPS (various devices) | ❌ Not measured | Report only JS microbenchmarks |
| Memory Usage | ❌ Not measured | Optional |
| Model Inference Latency (per model) | ⚠️ Session init only | Report session init times from README |

---

## Documentation Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Claiming "real-time" without FPS numbers | HIGH | Medium | Qualify: "Model inference dominates; JS tracking pipeline < 1ms/frame" |
| Implying benchmark dataset exists | MEDIUM | HIGH | Explicitly state: "No formal benchmark dataset used" |
| Presenting unit tests as MOT accuracy | MEDIUM | HIGH | Frame tests as "implementation validation," not "tracking accuracy" |
| Open-vocabulary mode appears fully working without model download notice | MEDIUM | Medium | Document placeholder gate + model download requirement |
| ReID appears active without OSNet download notice | MEDIUM | Medium | Document fallback behavior (IoU-only when OSNet missing) |
| Screenshots fabricated | HIGH | CRITICAL | **Only use real captures; mark placeholders clearly** |
| Association weights misstated | LOW | HIGH | Verify against `tracker.ts:436–444` (0.6/0.3/0.1/0.1) |
| State machine misnamed (NEW vs TENTATIVE) | LOW | HIGH | Use TENTATIVE/CONFIRMED/LOST/REMOVED throughout |

---

## Technical Inconsistencies

| Inconsistency | Location | Correct Value |
|---------------|----------|---------------|
| README "NEW → TRACKED → LOST → REMOVED" | `README.md:135–140` | Actual: TENTATIVE → CONFIRMED → LOST → REMOVED |
| README "confirmedHits >= 2" confirmation | `README.md:137` | Actual: `hits >= 3` OR `confirmedHits >= 2` (score ≥ 0.7) |
| README "5-frame grace period before LOST" | `README.md:138` | Actual: `timeSinceUpdate > 5` (6th missed frame) |
| README "30-frame max lost" | `README.md:139` | Actual: `maxTimeLost = 30` → REMOVED on 31st missed |
| VisionPanel "COCO-SSD model" | `src/components/VisionPanel.tsx:43` | Fixed to YOLOv8n in recent commit |
| OpenVisionPlayground "~24 ms (WebGPU)" latency | `src/components/landing/OpenVisionPlayground.tsx:161` | Fabricated; replaced with "Lazy-loaded" |
| Model table CLIP size "63 MB" | Old README version | Actual: ~254 MB (corrected in recent commit) |
| YOLO-World size "34 MB" | Old README version | Actual: ~418 MB (corrected) |

---

## Unsupported Claims (Marketing vs. Implementation)

| Claim | Source | Status | Correction |
|-------|--------|--------|------------|
| "Production-ready" | README:24 | ⚠️ Subjective | Qualify: "Feature-complete for demo/research; no production SLA" |
| "Zero data uploads" | README:24 | ✅ Verified | Fully client-side |
| "PWA Ready" | README:38 | ✅ Verified | SW + Manifest + COOP/COEP |
| "Re-ID (OSNet) appearance-based re-identification" | README:33 | ⚠️ Model-dependent | Only active when OSNet downloaded; fallback documented |
| "Open-vocabulary detection" | README:31 | ⚠️ Model-dependent | Requires 418 MB + 254 MB downloads |
| "49 unit tests across kalman/matching/tracker/workerUtils/store" | AGENTS.md:8 | ✅ Verified | Vitest output confirms |
| "Tracker fuses via EMA α=0.3 + cosine cost weight 0.3" | AGENTS.md:30 | ✅ Verified | `tracker.ts:164–176`, `tracker.ts:437–439` |
| "WebNN → WebGPU → WebGL → WASM cascade" | AGENTS.md:24 | ✅ Verified | `workerUtils.ts` `createAcceleratedSession` |

---

## Deployment Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Netlify deployment not loading models | MEDIUM | HIGH | Verify COOP/COEP headers; test model loading in production |
| WebGPU not available on user device | HIGH | MEDIUM | WASM fallback tested; document browser requirements |
| Camera permission denied on HTTP | HIGH | HIGH | `dev:https` script + Netlify HTTPS; document requirement |
| Large model downloads (418 MB + 254 MB) timeout | MEDIUM | MEDIUM | Downloader has 5-min timeout; document expected times |
| WASM memory (26 MB) + model memory OOM on mobile | MEDIUM | MEDIUM | Test on mobile; document limitations |
| Service Worker caching stale models | LOW | MEDIUM | SW only in prod; model cache headers set |

---

## Screenshot Requirements (Section 8)

| # | Screenshot | Description | Capture Method |
|---|------------|-------------|----------------|
| 1 | Application Interface | Full Command Center with sidebar, video, panels | Playwright full page |
| 2 | Input Video | Camera feed or test video playing | Playwright video element |
| 3 | Detection Result | Boxes + labels + confidences (no IDs yet) | Playwright after detection, before tracking |
| 4 | Multiple-Object Tracking | ≥3 objects with persistent IDs | Playwright multi-person scene |
| 5 | Persistent Identity IDs | Same object tracked across frames | Playwright sequence (or single frame with ID history) |
| 6 | Trajectory Visualization | Ghost mode trails | Playwright with Ghost mode enabled |
| 7 | Telemetry Panel | FPS, latency charts, tracking stats | Playwright Analytics panel |
| 8 | Crowded Scene | Multiple objects, potential occlusion | Playwright if reproducible |
| 9 | Final Tracking Result | Clean output with all overlays | Playwright composed view |

**If any cannot be captured**: Use `[INSERT ACTUAL SCREENSHOT]` placeholder with descriptive caption.

---

## Evaluation Limitations (Critical for Section 9)

| Limitation | Severity | Report Treatment |
|------------|----------|------------------|
| **No benchmark dataset** | CRITICAL | State explicitly in Dataset chapter AND Results chapter |
| **No ground truth annotations** | CRITICAL | Cannot compute MOTA/IDF1/HOTA |
| **No standardized evaluation pipeline** | CRITICAL | Not implemented; Future Work |
| **Qualitative only** | HIGH | Describe identity continuity, responsiveness, occlusion handling observed |
| **Device-dependent performance** | HIGH | Report JS microbenchmarks only; no FPS claims |
| **Browser/WebGPU variability** | MEDIUM | Note in Deployment + Limitations |
| **Model download required for full features** | MEDIUM | Document in Methodology + Getting Started |

---

## Recommendations Before Submission

### Must Do (Blocking)
1. **Capture real screenshots** via Playwright (Phase 4)
2. **Explicitly state "No MOTA/IDF1/HOTA computed"** in Results chapter
3. **Fix state machine terminology** throughout report (TENTATIVE, not NEW)
4. **Verify association weights** in report match code (0.6/0.3/0.1/0.1)
5. **Generate PPT** (Phase 8)
6. **Verify Netlify deployment** works end-to-end (Phase 9)

### Should Do (High Priority)
7. Expand Literature Review to 15–20 IEEE references with comparison table
8. Create deployment verification script (HTTP + browser checks)
9. Add Future Work subsection for standardized MOT evaluation
10. Document model download requirements clearly in Methodology
11. Verify all 49 tests pass in CI (they do locally)

### Nice to Do (Medium Priority)
12. Cross-browser test matrix (Chrome/Edge/Firefox/Safari)
13. Mobile camera test via `dev:https`
14. GitHub Actions for LaTeX compilation (after PDF works)
15. Memory/CPU profiling on representative devices

---

## Final Acceptance Checklist

| Criterion | Status | Notes |
|-----------|--------|-------|
| PROJECT_TRUTH.md complete | ✅ | Created |
| EVIDENCE_MATRIX.md complete | ✅ | Created |
| PROJECT_AUDIT.md complete | ✅ | This file |
| Screenshots captured | ❌ | Phase 4 |
| FIGURE_MANIFEST.md created | ❌ | After Phase 4 |
| Black book LaTeX compiles | ❌ | Phase 6–7 |
| All 12 sections present | ❌ | Phase 6 |
| No fabricated accuracy | ✅ | Enforced by audit |
| No fabricated MOT metrics | ✅ | Enforced by audit |
| Benchmark values traceable | ✅ | From README + tests |
| 49 tests verified | ✅ | Local `npm run test` |
| Literature review referenced | ❌ | Phase 6 |
| PPT generated | ❌ | Phase 8 |
| Deployment verified | ❌ | Phase 9 |
| Local verification script | ❌ | Phase 9 |
| Root README updated | ❌ | Phase 11 |

---

## Summary

**TrackVision is a technically impressive, well-engineered client-side MOT system** with genuine algorithmic depth (custom ByteTrack++, full Kalman, Hungarian, OSNet ReID, dual detection modes). The codebase is clean, tested (49 passing tests), and deployment-ready.

**The critical documentation gap is the absence of a benchmark dataset and standardized MOT metrics.** This is not a flaw in the implementation — it's a scope decision (real-time browser demo vs. benchmark submission). The report must **honestly reflect this limitation** while showcasing the engineering achievements.

**No fabrication needed. No fabrication permitted.** The implementation speaks for itself.

---
*Audit complete. Proceed to Phase 4 (Screenshot Capture) → Phase 5 (Black Book Generation).*