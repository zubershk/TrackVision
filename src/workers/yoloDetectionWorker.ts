import * as ort from 'onnxruntime-web';
import { 
  preprocessImage, 
  getIoU, 
  applyNMS, 
  applyNMSWithClass,
  COCO_CLASSES,
  createAcceleratedSession,
  detectExecutionProviderSupport,
  type ExecutionProviderType,
  type Detection, 
  type BBox, 
  type YOLOMessage, 
  type YOLOResponse, 
  type YOLOConfig 
} from './workerUtils';

// Configure ONNX WebAssembly environment for Web Worker
ort.env.wasm.numThreads = Math.min(4, typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 2) : 2);
ort.env.wasm.simd = true;
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';

let session: ort.InferenceSession | null = null;
let activeExecutionProvider: ExecutionProviderType = 'wasm';
let providerDescription = 'WASM SIMD';
let inputName = '';
let outputName = '';
let config: YOLOConfig | null = null;
let modelLoaded = false;
let preallocatedFloatData: Float32Array | null = null;

async function initModel(modelConfig: YOLOConfig): Promise<void> {
  config = modelConfig;
  
  const candidateUrls = [
    modelConfig.modelUrl,
    '/models/yolov8n.onnx',
    'https://huggingface.co/onnx-community/yolov8n/resolve/main/onnx/model.onnx',
    'https://raw.githubusercontent.com/onnx/models/main/vision/object_detection_segmentation/yolov8/yolov8n.onnx'
  ].filter(Boolean) as string[];

  // Remove duplicates
  const uniqueCandidateUrls = Array.from(new Set(candidateUrls));

  let arrayBuffer: ArrayBuffer | null = null;
  let lastError: Error | null = null;

  for (let idx = 0; idx < uniqueCandidateUrls.length; idx++) {
    const url = uniqueCandidateUrls[idx];
    try {
      console.log(`[YOLO Worker] Fetching model (attempt ${idx + 1}/${uniqueCandidateUrls.length}) from:`, url);
      self.postMessage({
        type: 'PROGRESS',
        msgId: 0,
        payload: {
          worker: 'yolo',
          stage: 'downloading',
          percent: 20 + idx * 25,
          loadedBytes: 0,
          totalBytes: 3511277,
          message: `Downloading YOLOv8n neural network weights (${idx > 0 ? 'CDN mirror' : 'primary'})...`
        }
      });

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const totalBytes = buffer.byteLength;
      console.log(`[YOLO Worker] Downloaded ${totalBytes} bytes from ${url}`);

      // Basic sanity check: YOLOv8n ONNX is at least 100KB (quantized or full is 3.5MB - 13MB)
      if (totalBytes < 100_000) {
        const headerText = new TextDecoder().decode(new Uint8Array(buffer.slice(0, Math.min(200, totalBytes))));
        throw new Error(`Incomplete or placeholder model file (${totalBytes} bytes, content: ${headerText.slice(0, 60)}...)`);
      }

      // Validate protobuf header (0x08 for standard ONNX)
      const firstByte = new Uint8Array(buffer.slice(0, 1))[0];
      if (firstByte !== 0x08) {
        console.warn(`[YOLO Worker] Warning: First byte is 0x${firstByte.toString(16)}, testing ONNX session parse...`);
      }

      arrayBuffer = buffer;
      break;
    } catch (err) {
      console.warn(`[YOLO Worker] Candidate ${url} failed:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (!arrayBuffer) {
    const err = lastError || new Error('All model candidate sources failed to load');
    self.postMessage({
      type: 'PROGRESS',
      msgId: 0,
      payload: {
        worker: 'yolo',
        stage: 'error',
        percent: 0,
        message: `Detector initialization failed: ${err.message}`
      }
    });
    throw err;
  }

  try {
    const totalBytes = arrayBuffer.byteLength;
    self.postMessage({
      type: 'PROGRESS',
      msgId: 0,
      payload: {
        worker: 'yolo',
        stage: 'compiling',
        percent: 85,
        loadedBytes: totalBytes,
        totalBytes: totalBytes,
        message: 'Probing hardware acceleration (WebGL / WebNN / WebGPU)...'
      }
    });

    console.log('[YOLO Worker] Creating ONNX session from ArrayBuffer with multi-provider fallback...');
    const sessionOptions: ort.InferenceSession.SessionOptions = {
      graphOptimizationLevel: 'all',
      enableMemPattern: true,
      enableCpuMemArena: true,
      executionMode: 'sequential',
      logSeverityLevel: 2
    };

    const accelerated = await createAcceleratedSession(
      ort,
      arrayBuffer,
      sessionOptions,
      'YOLO Worker',
      modelConfig.preferredProvider
    );

    session = accelerated.session;
    activeExecutionProvider = accelerated.provider;
    providerDescription = accelerated.description;
    
    inputName = session.inputNames[0];
    outputName = session.outputNames[0];
    modelLoaded = true;
    console.log(`[YOLO Worker] Model loaded with [${activeExecutionProvider}]: ${providerDescription}. Input: ${inputName}, Output: ${outputName}`);

    self.postMessage({
      type: 'PROGRESS',
      msgId: 0,
      payload: {
        worker: 'yolo',
        stage: 'ready',
        percent: 100,
        loadedBytes: totalBytes,
        totalBytes: totalBytes,
        executionProvider: activeExecutionProvider,
        deviceAcceleration: providerDescription,
        message: `YOLOv8n Detector ready (${providerDescription})`
      }
    });
  } catch (err) {
    console.error('[YOLO Worker] Model load failed:', err);
    modelLoaded = false;
    session = null;
    self.postMessage({
      type: 'PROGRESS',
      msgId: 0,
      payload: {
        worker: 'yolo',
        stage: 'error',
        percent: 0,
        message: `Detector initialization failed: ${String(err)}`
      }
    });
    throw err;
  }
}

function postprocess(
  output: Float32Array, 
  dims: readonly number[],
  originalW: number, 
  originalH: number, 
  confThreshold: number, 
  iouThreshold: number,
  customScale?: number,
  customOffsetX?: number,
  customOffsetY?: number
) {
  if (!config) return [];
  
  const numClasses = config?.classNames.length || 80;
  
  let isTransposed = false;
  let numBoxes = 0;
  let numDimensions = 0;
  let hasObjConf = false;

  // Determine model output shape
  // YOLOv8: [1, 84, 8400] (transposed, no obj conf)
  // YOLOv5/v7: [1, 8400, 85] (not transposed, has obj conf)
  if (dims.length === 3) {
    if (dims[1] < dims[2]) {
      isTransposed = true;
      numDimensions = Number(dims[1]);
      numBoxes = Number(dims[2]);
    } else {
      isTransposed = false;
      numBoxes = Number(dims[1]);
      numDimensions = Number(dims[2]);
    }
  } else if (dims.length === 2) {
    if (dims[0] < dims[1]) {
      isTransposed = true;
      numDimensions = Number(dims[0]);
      numBoxes = Number(dims[1]);
    } else {
      isTransposed = false;
      numBoxes = Number(dims[0]);
      numDimensions = Number(dims[1]);
    }
  } else {
    // Fallback if dims shape is weird
    numDimensions = 4 + numClasses;
    numBoxes = Math.floor(output.length / numDimensions);
    isTransposed = true; // Assume modern YOLOv8 export
  }

  // If numDimensions matches exactly 4 coords + 1 objConf + numClasses
  hasObjConf = (numDimensions === 4 + 1 + numClasses);
  
  const detections: Detection[] = [];
  const [inputW, inputH] = config?.inputSize || [640, 640];
  
  const scale = customScale ?? Math.min(inputW / originalW, inputH / originalH);
  const newW = Math.round(originalW * scale);
  const newH = Math.round(originalH * scale);
  const offsetX = customOffsetX ?? (inputW - newW) / 2;
  const offsetY = customOffsetY ?? (inputH - newH) / 2;
  
  for (let i = 0; i < numBoxes; i++) {
    let maxClassConf = -Infinity;
    let classId = 0;
    let objConf = 1.0;
    
    if (isTransposed) {
      if (hasObjConf) {
        objConf = output[4 * numBoxes + i];
        for (let c = 0; c < numClasses; c++) {
          const classConf = output[(5 + c) * numBoxes + i];
          if (classConf > maxClassConf) {
            maxClassConf = classConf;
            classId = c;
          }
        }
      } else {
        for (let c = 0; c < numClasses; c++) {
          const classConf = output[(4 + c) * numBoxes + i];
          if (classConf > maxClassConf) {
            maxClassConf = classConf;
            classId = c;
          }
        }
      }
    } else {
      const boxOffset = i * numDimensions;
      if (hasObjConf) {
        objConf = output[boxOffset + 4];
        for (let c = 0; c < numClasses; c++) {
          const classConf = output[boxOffset + 5 + c];
          if (classConf > maxClassConf) {
            maxClassConf = classConf;
            classId = c;
          }
        }
      } else {
        for (let c = 0; c < numClasses; c++) {
          const classConf = output[boxOffset + 4 + c];
          if (classConf > maxClassConf) {
            maxClassConf = classConf;
            classId = c;
          }
        }
      }
    }
    
    let finalConf = objConf * maxClassConf;
    if (finalConf > 1.0 || finalConf < 0.0) {
      const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
      finalConf = (hasObjConf ? sigmoid(objConf) : 1.0) * sigmoid(maxClassConf);
    }
  
    if (finalConf < confThreshold) continue;
    
    let cx, cy, w, h;
    if (isTransposed) {
      cx = output[0 * numBoxes + i];
      cy = output[1 * numBoxes + i];
      w = output[2 * numBoxes + i];
      h = output[3 * numBoxes + i];
    } else {
      const boxOffset = i * numDimensions;
      cx = output[boxOffset];
      cy = output[boxOffset + 1];
      w = output[boxOffset + 2];
      h = output[boxOffset + 3];
    }
    
    const x1 = (cx - w / 2 - offsetX) / scale;
    const y1 = (cy - h / 2 - offsetY) / scale;
    const x2 = (cx + w / 2 - offsetX) / scale;
    const y2 = (cy + h / 2 - offsetY) / scale;
    
    const finalX = Math.max(0, Math.min(x1, originalW));
    const finalY = Math.max(0, Math.min(y1, originalH));
    const finalW = Math.max(0, Math.min(x2, originalW) - finalX);
    const finalH = Math.max(0, Math.min(y2, originalH) - finalY);
    
    if (finalW > 1 && finalH > 1) {
      detections.push({
        bbox: [finalX, finalY, finalW, finalH],
        score: finalConf,
        class: config?.classNames[classId] || `class_${classId}`,
        classId
      });
    }
  }
  
  return applyNMSWithClass(detections, iouThreshold);
}

self.onmessage = async (event: MessageEvent<YOLOMessage>) => {
  const { type, payload, msgId } = event.data;

  if (type === 'INIT') {
    try {
      const modelConfig = {
        modelUrl: payload?.modelUrl || '/models/yolov8n.onnx',
        inputSize: payload?.inputSize || [640, 640],
        confidenceThreshold: payload?.confidenceThreshold || 0.5,
        iouThreshold: payload?.iouThreshold || 0.45,
        classNames: payload?.classNames || COCO_CLASSES,
        useWebGPU: payload?.useWebGPU !== false,
        preferredProvider: payload?.preferredProvider
      };
      console.log('[YOLO Worker] INIT received, starting model load...');
      await initModel(modelConfig);
      self.postMessage({ 
        type: 'READY', 
        msgId, 
        payload: { 
          classNames: config?.classNames,
          executionProvider: activeExecutionProvider,
          deviceAcceleration: providerDescription
        } 
      });
      console.log('[YOLO Worker] Model ready, sent READY');
    } catch (err) {
      console.error('[YOLO Worker] INIT failed:', err);
      self.postMessage({ type: 'ERROR', msgId, payload: { error: String(err) } });
    }
  }

  if (type === 'PROBE_PROVIDERS') {
    const support = detectExecutionProviderSupport();
    self.postMessage({
      type: 'PROBE_RESULT',
      msgId,
      payload: {
        ...support,
        activeProvider: activeExecutionProvider,
        providerDescription
      }
    });
    return;
  }

  if (type === 'DETECT') {
    if (!modelLoaded) {
      self.postMessage({ type: 'DETECTION_RESULT', msgId, payload: { results: [], inferenceMs: 0, error: 'Model not loaded' } });
      return;
    }
    
    const { imageData, buffer, width, height, originalWidth, originalHeight, scale, offsetX, offsetY, confidenceThreshold, iouThreshold } = payload;
    const threshold = confidenceThreshold ?? config?.confidenceThreshold ?? 0.5;
    const iouThresh = iouThreshold ?? config?.iouThreshold ?? 0.45;
    
    if (!session) {
      self.postMessage({
        type: 'DETECTION_RESULT',
        msgId,
        payload: { results: [], inferenceMs: 0, error: 'Inference session not ready' }
      });
      return;
    }
    
    try {
      const preprocessStart = performance.now();
      const [inputW, inputH] = config!.inputSize;
      const numPixels = inputW * inputH;

      if (!preallocatedFloatData || preallocatedFloatData.length !== 3 * numPixels) {
        preallocatedFloatData = new Float32Array(3 * numPixels);
      }

      if (buffer) {
        // Fast zero-copy planar conversion from transferred RGBA buffer
        const u8 = new Uint8Array(buffer);
        const rOffset = 0;
        const gOffset = numPixels;
        const bOffset = numPixels * 2;
        const inv255 = 1 / 255;
        
        for (let i = 0, p = 0; i < numPixels; i++, p += 4) {
          preallocatedFloatData[rOffset + i] = u8[p] * inv255;
          preallocatedFloatData[gOffset + i] = u8[p + 1] * inv255;
          preallocatedFloatData[bOffset + i] = u8[p + 2] * inv255;
        }
      } else if (imageData) {
        // Fallback for legacy ImageData inputs
        const inputData = preprocessImage(imageData, config!.inputSize);
        preallocatedFloatData.set(inputData);
      }
      const preprocessMs = performance.now() - preprocessStart;
      
      const inputTensor = new ort.Tensor('float32', preallocatedFloatData, [1, 3, inputH, inputW]);
      
      const inferenceStart = performance.now();
      const results = await session!.run({ [inputName]: inputTensor });
      const inferenceMs = performance.now() - inferenceStart;

      const postprocessStart = performance.now();
      const output = results[outputName].data as Float32Array;
      const dims = results[outputName].dims;
      
      const origW = originalWidth || imageData?.width || inputW;
      const origH = originalHeight || imageData?.height || inputH;
      
      const detections = postprocess(output, dims, origW, origH, threshold, iouThresh, scale, offsetX, offsetY);
      const postprocessMs = performance.now() - postprocessStart;
      
      self.postMessage({
        type: 'DETECTION_RESULT',
        msgId,
        payload: { 
          results: detections, 
          inferenceMs,
          preprocessMs,
          postprocessMs,
          executionProvider: activeExecutionProvider,
          deviceAcceleration: providerDescription
        }
      });
    } catch (err) {
      console.error('[YOLO Worker] Detection failed:', err);
      self.postMessage({
        type: 'DETECTION_RESULT',
        msgId,
        payload: { results: [], inferenceMs: 0, error: String(err) }
      });
    }
  }

  if (type === 'SET_CONCEPTS') {
    self.postMessage({ type: 'READY', msgId, payload: { success: true } });
  }
};