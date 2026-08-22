import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = path.join(__dirname, '../public/models');

// Use more reliable direct download URLs
const MODELS = [
  {
    name: 'yolov8n.onnx',
    urls: [
      'https://github.com/CVHub520/X-AnyLabeling/releases/download/v0.1.0/yolov8n.onnx',
      'https://huggingface.co/onnx-community/yolov8n/resolve/main/onnx/model.onnx?download=true'
    ],
    size: '~12.8 MB'
  },
  {
    name: 'yoloworld.onnx',
    urls: [
      'https://github.com/AILab-CVC/YOLO-World/releases/download/v0.1.0/yolo_world_l.onnx',
      'https://huggingface.co/TencentAI/Yolo-World/resolve/main/yolo_world_l.onnx?download=true'
    ],
    size: '~34 MB'
  },
  {
    name: 'osnet_x1_0.onnx',
    urls: [
      'https://github.com/microsoft/onnxruntime/raw/main/test/testdata/osnet_x1_0.onnx',
      'https://huggingface.co/akhaliq/osnet_x1_0/resolve/main/osnet_x1_0.onnx?download=true'
    ],
    size: '~9.1 MB'
  },
  {
    name: 'clip_text_encoder.onnx',
    urls: [
      'https://huggingface.co/onnx-community/clip-vit-base-patch32/resolve/main/text_model.onnx?download=true'
    ],
    size: '~63 MB'
  }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const file = fs.createWriteStream(dest);
    
    const request = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301 || response.statusCode === 307 || response.statusCode === 308) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlink(dest, () => {});
          console.log(`  Redirecting to: ${redirectUrl}`);
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
          console.log(`\n  ✓ Downloaded: ${path.basename(dest)} (${(downloaded / 1024 / 1024).toFixed(1)} MB)`);
          resolve();
        });
      });
    }).on('error', (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });
    
    // Timeout after 5 minutes
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
      return true;
    } catch (err) {
      console.log(`  ✗ Failed: ${err.message}`);
    }
  }
  return false;
}

async function main() {
  console.log('TrackVision Model Downloader');
  console.log('============================\n');
  
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }
  
  const results = [];
  for (const model of MODELS) {
    console.log(`\nDownloading ${model.name} (${model.size})...`);
    const success = await downloadWithFallback(model);
    results.push({ name: model.name, success });
  }
  
  console.log('\n============================');
  console.log('Download Summary:');
  results.forEach(r => {
    console.log(`${r.success ? '✓' : '✗'} ${r.name}`);
  });
  
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.log('\n⚠ Some models failed to download. The app will use fallback embeddings.');
    process.exit(1);
  } else {
    console.log('\n✓ All models downloaded successfully!');
  }
}

main().catch(console.error);