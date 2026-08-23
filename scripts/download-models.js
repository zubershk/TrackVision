import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = path.join(__dirname, '../public/models');

// Minimum plausible sizes for real (non-placeholder) models
const MIN_BYTES = {
  'yolov8n.onnx': 1_000_000,
  'yoloworld.onnx': 10_000_000,
  'osnet_x1_0.onnx': 1_000_000,
  'clip_text_encoder.onnx': 1_000_000
};

// Sources are tried in order, all verified reachable as of 2026-08:
//  - OSNet: Axelera-hosted Market1501 conversion (input 1x3x256x128 NCHW RGB, ~8.4 MB)
//  - CLIP text encoder: Xenova/clip-vit-base-patch32 ONNX export (int64 input_ids [N,77])
//  - YOLO-World: only huge research exports exist upstream (~400 MB). NOTE: our worker runs a
//    single-image-input graph and derives classes from concepts at runtime; wkentaro's export
//    expects precomputed text embeddings as a second input, so a matching export is required
//    for full open-vocab support. Downloading it alone will not enable open mode.
const MODELS = [
  {
    name: 'yolov8n.onnx',
    urls: [
      'https://github.com/CVHub520/X-AnyLabeling/releases/download/v0.1.0/yolov8n.onnx',
      'https://huggingface.co/onnx-community/yolov8n/resolve/main/onnx/model.onnx?download=true'
    ],
    optional: false
  },
  {
    name: 'yoloworld.onnx',
    urls: [
      'https://github.com/wkentaro/yolo-world-onnx/releases/download/v0.1.0/yolo_world_v2_xl_vlpan_bn_2e-3_100e_4x8gpus_obj365v1_goldg_train_lvis_minival.onnx'
    ],
    optional: true
  },
  {
    name: 'osnet_x1_0.onnx',
    urls: [
      'https://media.axelera.ai/artifacts/model_cards/weights/others/re-id/osnet_x1_0_market.onnx',
      'https://huggingface.co/akhaliq/osnet_x1_0/resolve/main/osnet_x1_0.onnx?download=true'
    ],
    optional: true
  },
  {
    name: 'clip_text_encoder.onnx',
    urls: [
      'https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/main/onnx/text_model.onnx?download=true'
    ],
    optional: true
  }
];

function looksLikeOnnx(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(1);
    fs.readSync(fd, buf, 0, 1, 0);
    fs.closeSync(fd);
    return buf[0] === 0x08;
  } catch {
    return false;
  }
}

function validateModel(name, filePath) {
  const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
  if (!stat || stat.size === 0) return { valid: false, reason: 'file missing or empty' };
  const min = MIN_BYTES[name] || 100_000;
  if (stat.size < min) return { valid: false, reason: `too small (${stat.size} B < ${min} B) — placeholder?` };
  if (!looksLikeOnnx(filePath)) return { valid: false, reason: 'missing ONNX magic byte (0x08)' };
  return { valid: true };
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const file = fs.createWriteStream(dest);

    const request = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (response) => {
      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlink(dest, () => {});
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloaded = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (totalSize > 0) {
          const percent = ((downloaded / totalSize) * 100).toFixed(1);
          process.stdout.write(`\r  Progress: ${percent}% (${(downloaded / 1024 / 1024).toFixed(1)} / ${(totalSize / 1024 / 1024).toFixed(1)} MB)`);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close(() => {
          console.log(`\n  Downloaded: ${path.basename(dest)} (${(downloaded / 1024 / 1024).toFixed(1)} MB)`);
          resolve();
        });
      });
    }).on('error', (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });

    request.setTimeout(300000, () => {
      request.destroy();
      file.close();
      fs.unlink(dest, () => {});
      reject(new Error('Download timeout'));
    });
  });
}

async function downloadWithFallback(model) {
  for (const url of model.urls) {
    try {
      console.log(`  Trying: ${url}`);
      await downloadFile(url, path.join(MODELS_DIR, model.name));
      const check = validateModel(model.name, path.join(MODELS_DIR, model.name));
      if (check.valid) return true;
      console.log(`  Download invalid: ${check.reason} — trying next source`);
      fs.unlinkSync(path.join(MODELS_DIR, model.name));
    } catch (err) {
      console.log(`  Failed: ${err.message}`);
    }
  }
  return false;
}

async function main() {
  const force = process.argv.includes('--force');
  console.log('TrackVision Model Downloader');
  console.log('============================\n');

  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  const results = [];
  for (const model of MODELS) {
    const dest = path.join(MODELS_DIR, model.name);
    const existing = validateModel(model.name, dest);
    if (existing.valid && !force) {
      console.log(`\n${model.name}: already present and valid — skipping (use --force to redownload)`);
      results.push({ name: model.name, success: true, skipped: true });
      continue;
    }

    console.log(`\nDownloading ${model.name}${model.optional ? ' (optional)' : ''}...`);
    const success = await downloadWithFallback(model);
    results.push({ name: model.name, success });
  }

  console.log('\n============================');
  console.log('Download Summary:');
  results.forEach(r => {
    const tag = r.skipped ? '(cached)' : '';
    console.log(`${r.success ? '✓' : '✗'} ${r.name} ${tag}`.trimEnd());
  });

  const failedRequired = results.filter(r => !r.success && !MODELS.find(m => m.name === r.name)?.optional);
  const failedOptional = results.filter(r => !r.success && MODELS.find(m => m.name === r.name)?.optional);

  if (failedOptional.length > 0) {
    console.log('\n⚠ Optional models failed:');
    failedOptional.forEach(r => console.log(`  - ${r.name}`));
    console.log('  Fast mode works without them.');
    console.log('  ReID appearance matching needs osnet_x1_0.onnx (Axelera mirror above).');
    console.log('  Open mode additionally needs a YOLO-World export whose graph takes a single');
    console.log('  image input and bakes in your concept classes (custom torchexport required).');
  }

  if (failedRequired.length > 0) {
    console.log('\n✗ Required models failed to download:');
    failedRequired.forEach(r => console.log(`  - ${r.name}`));
    process.exit(1);
  }

  console.log('\n✓ Done. Reload the app to pick up new models.');
}

main().catch(console.error);
