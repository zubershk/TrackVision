# TrackVision Deployment Instructions

## Overview

TrackVision is a fully client-side Multiple Object Tracking (MOT) application that runs entirely in the browser. No server-side computation is required. The application can be deployed to any static hosting provider (Netlify, Vercel, Cloudflare Pages, GitHub Pages, AWS S3 + CloudFront, etc.) or run locally via Docker.

---

## Prerequisites

### For Development
- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (comes with Node.js)
- **Modern browser** with WebGPU support:
  - Chrome 113+ / Edge 113+ (full WebGPU)
  - Firefox 120+ (behind flag: `dom.webgpu.enabled`)
  - Safari 16.4+ (experimental)
- **HTTPS or localhost** required for camera access (`getUserMedia`)

### For Production Deployment
- Static hosting account (Netlify, Vercel, Cloudflare Pages, etc.)
- Domain with SSL certificate (required for camera access on mobile/LAN)
- Optional: Custom domain configured

---

## Quick Start (Local Development)

### 1. Clone and Install
```bash
git clone https://github.com/zubershk/TrackVision.git
cd TrackVision
npm install
```

### 2. Download Models (Optional but Recommended)
```bash
# Downloads all optional models (~680 MB total)
node scripts/download-models.js

# Without optional models, only Fast Mode (YOLOv8n) works
# Open Mode (YOLO-World + CLIP) and ReID (OSNet) require these downloads
```

### 3. Start Development Server

**HTTP (localhost only - camera works):**
```bash
npm run dev
# Serves at http://localhost:3000
```

**HTTPS (LAN access - required for mobile camera):**
```bash
npm run dev:https
# Serves at https://localhost:3000 and https://<LAN-IP>:3000
# Uses self-signed certificate; accept browser warning
```

### 4. Open Application
1. Navigate to the URL shown in terminal
2. Click **"Launch Command Center"**
3. Wait for model initialization (YOLOv8n ~1.8s on WebGPU)
4. Click **"Start Tracking"**
5. Grant camera permission when prompted
6. Tracking begins automatically

---

## Model Setup

### Included Model (Fast Mode Only)
| Model | File | Size | Status |
|-------|------|------|--------|
| YOLOv8n | `yolov8n.onnx` | 12.8 MB | **Included in repo** |

### Optional Models (Open Mode + ReID)
| Model | File | Size | Purpose |
|-------|------|------|---------|
| YOLO-World | `yoloworld.onnx` | ~418 MB | Open-vocabulary detection |
| CLIP Text Encoder | `clip_text_encoder.onnx` | ~254 MB | Text-to-embedding for YOLO-World |
| OSNet x1.0 | `osnet_x1_0.onnx` | ~8.8 MB | ReID appearance embeddings |
| CLIP Tokenizer | `clip-tokenizer/` | ~1.4 MB | BPE vocab + merges (included) |

**Download all optional models:**
```bash
node scripts/download-models.js
# Use --force to re-download
node scripts/download-models.js --force
```

**Model sources (verified reachable as of 2026):**
- YOLOv8n: `github.com/CVHub520/X-AnyLabeling` / HuggingFace `onnx-community/yolov8n`
- YOLO-World: `github.com/wkentaro/yolo-world-onnx` (XL RepVL-PAN export)
- OSNet: Axelera mirror (Market1501) / HuggingFace `akhaliq/osnet_x1_0`
- CLIP Text: HuggingFace `Xenova/clip-vit-base-patch32`

---

## Production Build

```bash
# Builds to dist/ (runs model verification first)
npm run build

# Preview production build locally
npm run preview
# Serves dist/ at http://localhost:4173
```

### Build Output Structure
```
dist/
├── index.html
├── assets/
│   ├── index-*.js          # Main bundle (~345 KB)
│   ├── charts-*.js         # Recharts lazy chunk (~373 KB)
│   ├── vendor-*.js         # Vendor chunk (~36 KB)
│   ├── yoloDetectionWorker-*.js
│   ├── yoloWorldWorker-*.js
│   ├── reidWorker-*.js
│   ├── trackerWorker-*.js
│   └── index-*.css         # Styles (~81 KB)
├── models/
│   ├── yolov8n.onnx        # 12.8 MB
│   ├── yoloworld.onnx      # 418 MB (if downloaded)
│   ├── osnet_x1_0.onnx     # 8.8 MB (if downloaded)
│   ├── clip_text_encoder.onnx  # 254 MB (if downloaded)
│   └── clip-tokenizer/
│       ├── vocab.json
│       └── merges.txt
├── sw.js                   # Service Worker (PWA)
├── manifest.json           # PWA Manifest
└── MODEL_INFO.json         # Model metadata
```

---

## Static Hosting Deployment

### Netlify (Recommended)
1. **Connect repository:** Link GitHub repo in Netlify dashboard
2. **Build settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `18` (set in `netlify.toml` or UI)
3. **Deploy:** Netlify auto-detects and deploys
4. **Headers:** `netlify.toml` includes required COOP/COEP headers

### Vercel
1. **Import project:** Connect GitHub repo
2. **Framework preset:** Vite (auto-detected)
3. **Build command:** `npm run build`
4. **Output directory:** `dist`
5. **Headers:** Add `vercel.json` or configure in dashboard for COOP/COEP

### Cloudflare Pages
1. **Connect repository:** GitHub integration
2. **Build command:** `npm run build`
3. **Build output directory:** `dist`
4. **Headers:** Use `_headers` file or Workers for COOP/COEP

### Manual Static Hosting (Any Provider)
```bash
npm run build
# Upload dist/ folder to your static host
# Ensure HTTPS is enabled
# Configure COOP/COEP headers (see below)
```

---

## Required HTTP Headers

**Critical for WebGPU + SharedArrayBuffer support:**

| Header | Value | Purpose |
|--------|-------|---------|
| `Cross-Origin-Opener-Policy` | `same-origin` | Required for SharedArrayBuffer |
| `Cross-Origin-Embedder-Policy` | `require-corp` | Required for WebGPU/SharedArrayBuffer |
| `Cache-Control` (models) | `public, max-age=31536000, immutable` | Long-term model caching |

### Nginx Configuration
```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name your-domain.com;
    root /var/www/trackvision;
    index index.html;

    # Required for WebGPU + SharedArrayBuffer
    add_header Cross-Origin-Opener-Policy "same-origin";
    add_header Cross-Origin-Embedder-Policy "require-corp";

    # Model caching (1 year)
    location /models/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header Cross-Origin-Embedder-Policy "require-corp";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # SSL (Let's Encrypt or your cert)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
}
```

### Netlify (netlify.toml)
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"

[[headers]]
  for = "/models/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    Cross-Origin-Embedder-Policy = "require-corp"
```

### Vercel (vercel.json)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    },
    {
      "source": "/models/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

---

## Docker Deployment

### Dockerfile
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Build and Run
```bash
docker build -t trackvision .
docker run -d -p 80:80 --name trackvision trackvision

# With SSL (mount certs)
docker run -d -p 80:80 -p 443:443 \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  --name trackvision trackvision
```

### Docker Compose
```yaml
version: '3.8'
services:
  trackvision:
    build: .
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
    restart: unless-stopped
```

---

## Environment Variables

**None required** — TrackVision is fully client-side.

> **Note:** Older documentation mentioned `VITE_HF_TOKEN` and `VITE_MODEL_CDN`. These are **not read by any code** and can be ignored.

---

## Camera Access Requirements

| Context | Requirement |
|---------|-------------|
| `localhost` (dev) | Works on HTTP |
| `127.0.0.1` (dev) | Works on HTTP |
| LAN IP (e.g., `192.168.x.x`) | **Requires HTTPS** |
| Custom domain | **Requires HTTPS + valid SSL** |
| Production (Netlify/Vercel) | HTTPS automatic |

**For mobile/LAN testing:**
```bash
npm run dev:https
# Access via https://<your-lan-ip>:3000
# Accept self-signed certificate warning on phone
```

---

## Verification Checklist

After deployment, verify:

- [ ] Site loads at your URL
- [ ] Landing page displays correctly
- [ ] "Launch Command Center" navigates to app
- [ ] Model initialization completes (YOLOv8n loads)
- [ ] Camera permission prompt appears
- [ ] Video feed appears after granting permission
- [ ] Detection boxes appear on objects
- [ ] Tracking IDs persist across frames
- [ ] Telemetry updates (FPS, latency)
- [ ] Ghost/Follow/Replay modes work
- [ ] No console errors (check DevTools)
- [ ] COOP/COEP headers present (check Network tab)
- [ ] PWA installs correctly (Add to Home Screen)

---

## Troubleshooting

### Camera not working
- **HTTPS required** for non-localhost origins
- Check browser permissions (lock icon → Camera → Allow)
- Try `npm run dev:https` for LAN testing
- Some browsers block camera on insecure contexts

### Models not loading
- Run `npm run check-models` to verify
- Check Network tab for failed model requests
- Ensure COOP/COEP headers are set correctly
- Large models (YOLO-World 418 MB) may timeout on slow connections

### WebGPU not available
- Fallback: WASM (automatic)
- Chrome: `chrome://flags` → Enable "WebGPU"
- Firefox: `about:config` → `dom.webgpu.enabled = true`
- Safari: Settings → Advanced → Experimental Features → WebGPU

### Performance issues
- Reduce confidence threshold (Vision Panel)
- Close other GPU-heavy tabs
- Ensure hardware acceleration enabled in browser
- Try WASM if WebGPU unstable: set `useWebGPU: false` in worker init

### Build fails
- Run `npm run check-models` — missing/invalid `yolov8n.onnx` blocks build
- Ensure Node.js 18+ and clean `npm ci`
- Delete `node_modules` and `package-lock.json`, re-run `npm install`

---

## File Structure Reference

```
TrackVision/
├── public/
│   ├── models/                 # ONNX models (yolov8n included)
│   │   ├── yolov8n.onnx
│   │   ├── yoloworld.onnx      # optional
│   │   ├── osnet_x1_0.onnx     # optional
│   │   ├── clip_text_encoder.onnx  # optional
│   │   └── clip-tokenizer/     # vocab + merges (included)
│   ├── sw.js                   # Service Worker
│   └── manifest.json           # PWA manifest
├── scripts/
│   ├── download-models.js      # Model downloader
│   ├── verify-models.js        # Build-time gate
│   ├── dev-https.js            # HTTPS dev wrapper
│   └── clean.js                # Cross-platform clean
├── src/
│   ├── components/             # React components
│   ├── hooks/                  # Custom hooks (workers, engine)
│   ├── lib/                    # Core algorithms (TS)
│   ├── workers/                # Web Workers
│   ├── store.ts                # Zustand store
│   └── styles/                 # Liquid Glass CSS
├── dist/                       # Production build output
├── netlify.toml                # Netlify config
├── vercel.json                 # Vercel config
├── nginx.conf                  # Nginx config
├── Dockerfile                  # Docker build
├── package.json
└── README.md
```

---

## Support

- **Issues:** [GitHub Issues](https://github.com/zubershk/TrackVision/issues)
- **Discussions:** [GitHub Discussions](https://github.com/zubershk/TrackVision/discussions)
- **Documentation:** This file + README.md

---

*TrackVision — Precision Object Intelligence*