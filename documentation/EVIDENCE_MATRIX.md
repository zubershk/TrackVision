# Evidence Matrix — TrackVision Unit 2 Mini Project

Maps each college requirement to actual repository evidence.

---

## Mandatory Requirements (12)

| # | Requirement | Evidence | Repository Path | Status | Missing Evidence | Action Required |
|---|-------------|----------|-----------------|--------|------------------|-----------------|
| 1 | **Aim** | Project description in README; package.json description; store.ts vision modes | `README.md:24`, `package.json:5`, `src/store.ts:99` | ✅ Verified | None | Extract precise aim statement for report |
| 2 | **Introduction** | README Overview + Pipeline Architecture + Detection/Tracking/ReID sections | `README.md:22–190` | ✅ Verified | Formal academic framing needed | Rewrite in academic style with citations |
| 3 | **Literature Review** | README references (ByteTrack, YOLOv8, YOLO-World, OSNet, CLIP, ONNX Runtime) | `README.md:518–526`, `README.md:134–162` | ⚠️ Partial | Structured comparison table; IEEE citations; clear theory vs. implementation distinction | Create formal literature review chapter with 15–20 references |
| 4 | **Dataset Description / Details** | **No formal dataset** — live camera / user video only | `CameraHUD.tsx`, `useOffscreenCanvas.ts`, `store.ts` | ✅ Verified (negative) | Benchmark dataset for MOT metrics | Document honestly: "No formal benchmark dataset used" |
| 5 | **Methodology** | Complete pipeline in useVisionEngine.ts + workers + tracker | `src/hooks/useVisionEngine.ts`, `src/workers/*.ts`, `src/lib/tracker.ts` | ✅ Verified | None | Document all 13 subsections with code references |
| 6 | **Algorithm / Flowchart** | ByteTrack++ lifecycle, Kalman, Hungarian, ReID fusion, NMS | `src/lib/tracker.ts`, `src/lib/kalman.ts`, `src/lib/matching.ts`, `src/workers/reidWorker.ts`, `src/workers/workerUtils.ts` | ✅ Verified | TikZ flowchart matching actual 4-stage process | Generate pseudocode + TikZ flowchart from actual code |
| 7 | **Source Code** | All core algorithms in TypeScript | `src/lib/*.ts`, `src/workers/*.ts`, `src/hooks/useVisionEngine.ts` | ✅ Verified | Selection of 6–8 key listings for report | Curate listings with captions and explanations |
| 8 | **Output Screenshots** | **ZERO screenshots in repo** | — | ❌ Missing | 9 required screenshots | **Phase 4**: Capture via Playwright from running app |
| 9 | **Result & Accuracy** | Microbenchmarks (0.31–1.04 ms), session init times, bundle sizes, 49 tests | `README.md:326–365`, `vitest.config.ts`, test files | ⚠️ Partial | **No MOTA/IDF1/HOTA** — must state explicitly | Report only measured data; add Future Work subsection |
| 10 | **Applications** | README UI/UX + UseCasesSection landing component | `README.md:193–220`, `src/components/landing/UseCasesSection.tsx` | ✅ Verified | Distinguish demonstrated vs. potential | Separate demonstrated (browser MOT) from potential |
| 11 | **Conclusion** | README summary + Acknowledgments | `README.md:24`, `README.md:536–540` | ✅ Verified | Formal academic conclusion with limitations | Write structured conclusion |
| 12 | **References** | README Acknowledgments (6 sources) | `README.md:518–526` | ⚠️ Partial | Need 15–20 IEEE references; original papers | Expand to original research papers + technical docs |

---

## Additional Requirements

| # | Requirement | Evidence | Repository Path | Status | Missing Evidence | Action Required |
|---|-------------|----------|-----------------|--------|------------------|-----------------|
| 13 | **PPT / Presentation** | No PPT in repo | — | ❌ Missing | 20-slide PPTX | **Phase 8**: Generate via python-pptx |
| 14 | **Working Deployment** | Netlify: `traackvision.netlify.app`; netlify.toml; vercel.json; nginx.conf; Dockerfile | `netlify.toml`, `vercel.json`, `nginx.conf`, `Dockerfile` (implied), `README.md:368–422` | ⚠️ Partial | Verification of live deployment; local verification script | **Phase 9**: Test Netlify + create verification script |

---

## Evidence Summary

| Category | Verified | Partial | Missing | Total |
|----------|----------|---------|---------|-------|
| Mandatory (12) | 6 | 4 | 2 | 12 |
| Additional (2) | 0 | 1 | 1 | 2 |
| **Overall** | **6** | **5** | **3** | **14** |

---

## Critical Gaps Requiring Action

| Gap | Severity | Resolution |
|-----|----------|------------|
| **No screenshots** (Req 8) | **BLOCKING** | Phase 4: Playwright automation to capture real app output |
| **No MOTA/IDF1/HOTA** (Req 9) | **BLOCKING** | Must explicitly state "not computed" + Future Work subsection |
| **No formal Literature Review** (Req 3) | **HIGH** | Create structured chapter with comparison table + 15–20 IEEE refs |
| **No PPT** (Req 13) | **HIGH** | Phase 8: Generate 20-slide presentation |
| **Deployment Verification** (Req 14) | **MEDIUM** | Phase 9: Test Netlify + create local verification script |
| **References** (Req 12) | **MEDIUM** | Expand to original papers (ByteTrack, YOLOv8, YOLO-World, OSNet, CLIP, Kalman, Hungarian) |

---

## Traceability: Requirement → Code Location

| Requirement | Primary Code Evidence |
|-------------|----------------------|
| Aim | `src/store.ts:99` (visionMode), `package.json:5` |
| Introduction | `README.md:22–40`, `src/App.tsx` (Landing vs CommandCenter) |
| Literature Review | `README.md:134–162`, `README.md:518–526` |
| Dataset | `src/components/CameraHUD.tsx`, `src/hooks/useOffscreenCanvas.ts` |
| Methodology | `src/hooks/useVisionEngine.ts:133–295` (processFrame) |
| Algorithm | `src/lib/tracker.ts:277–357` (ByteTracker.update), `src/lib/kalman.ts:76–186`, `src/lib/matching.ts:48–157` |
| Flowchart | `src/lib/tracker.ts:277–357` (4-stage ByteTrack) |
| Source Code | `src/lib/tracker.ts`, `src/lib/kalman.ts`, `src/lib/matching.ts`, `src/workers/reidWorker.ts`, `src/workers/yoloDetectionWorker.ts`, `src/workers/yoloWorldWorker.ts`, `src/hooks/useVisionEngine.ts`, `src/workers/workerUtils.ts` |
| Screenshots | **NONE** — must capture |
| Results | `README.md:326–365`, `src/lib/tracker.test.ts` (benchmarks) |
| Accuracy | **NO MOT METRICS** — only microbenchmarks + unit tests |
| Applications | `README.md:193–220`, `src/components/landing/UseCasesSection.tsx` |
| Conclusion | `README.md:24`, `README.md:536–540` |
| References | `README.md:518–526` |
| PPT | **NONE** |
| Deployment | `netlify.toml`, `vercel.json`, `README.md:368–422` |

---

## Verification Checklist for Report Generation

Before writing each report section, verify:

- [ ] Every technical claim has a code reference (file:line)
- [ ] No claim exceeds what the implementation actually does
- [ ] "Not implemented" items are explicitly labeled
- [ ] No benchmark dataset is claimed
- [ ] No MOTA/IDF1/HOTA values are fabricated
- [ ] All 49 tests are traceable to test files
- [ ] Association weights match `ByteTracker.matchDetections()` exactly (0.6/0.3/0.1/0.1)
- [ ] State machine uses TENTATIVE/CONFIRMED/LOST/REMOVED (not NEW/TRACKED)
- [ ] Open-vocabulary mode dependencies (CLIP tokenizer, text encoder) are documented
- [ ] Model sizes match `MODEL_INFO.json` and `download-models.js`

---
*This matrix must be complete before any report chapter is written.*