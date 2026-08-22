import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsDir = path.join(__dirname, '../public/models');
const models = ['yolov8n.onnx'];

console.log('🔍 Verifying ONNX model files...\n');

let allValid = true;
models.forEach(model => {
  const filePath = path.join(modelsDir, model);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ MISSING: ${model}`);
    allValid = false;
    return;
  }

  const stats = fs.statSync(filePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  if (stats.size < 100_000) {
    console.error(`❌ CORRUPT/PLACEHOLDER: ${model} is only ${(stats.size / 1024).toFixed(2)} KB`);
    allValid = false;
    return;
  }

  // Check if file starts with ONNX protobuf header tag: 0x08
  const buffer = Buffer.alloc(4);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);
  
  const isValidOnnx = buffer[0] === 0x08;
  
  if (isValidOnnx) {
    console.log(`✅ VALID:   ${model} (${sizeMB} MB) - Magic header 0x08 verified`);
  } else {
    console.error(`❌ CORRUPT: ${model} - Does not start with ONNX protobuf byte (0x08)`);
    console.error(`   First 4 bytes: ${buffer.toString('hex')}`);
    allValid = false;
  }
});

if (!allValid) {
  console.error('\n⚠️  Some models are missing or corrupted!\n');
  process.exit(1);
}

console.log('\n✅ All models verified successfully!\n');
