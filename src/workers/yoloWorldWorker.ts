import * as ort from 'onnxruntime-web';
import {
  preprocessImage,
  getIoU,
  applyNMS,
  applyNMSWithClass,
  COCO_CLASSES,
  createAcceleratedSession,
  type ExecutionProviderType,
  type Detection,
  type BBox,
  type YOLOWorldMessage,
  type YOLOWorldResponse,
  type YOLOWorldConfig
} from './workerUtils';
import { CLIPTokenizer } from './clipTokenizer';

// Configure ONNX WebAssembly environment for Web Worker
ort.env.wasm.numThreads = Math.min(4, typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 2) : 2);
ort.env.wasm.simd = true;
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';

let session: ort.InferenceSession | null = null;
let clipSession: ort.InferenceSession | null = null;
let activeProvider: ExecutionProviderType = 'wasm';
let providerDescription = 'WASM SIMD';
let inputName = '';
let outputName = '';
let clipInputName = '';
let clipOutputName = '';
let config: YOLOWorldConfig | null = null;
let modelLoaded = false;
let modelIsPlaceholder = false;
let clipLoaded = false;
let currentConcepts: string[] = [];
let conceptEmbeddings: Float32Array[] = [];
let tokenizer: CLIPTokenizer | null = null;
let needsTextFeatures = false;
let textInputName = '';
let scoresOutputName = '';
let boxesOutputName = '';

const DEFAULT_CONCEPTS = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
  'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
  'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

async function initModel(modelConfig: YOLOWorldConfig): Promise<void> {
  config = modelConfig;
  currentConcepts = modelConfig.classNames || [];
  
  try {
    console.log('[YOLO-World Worker] Initializing model:', modelConfig.modelUrl);
    
    // Check if model URL is accessible
    let modelSize = 0;
    try {
      const response = await fetch(modelConfig.modelUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`Model file not found: ${response.status} ${response.statusText}`);
      }
      const sizeHeader = response.headers.get('content-length');
      modelSize = sizeHeader ? parseInt(sizeHeader, 10) : 0;
      console.log('[YOLO-World Worker] Model file accessible, size:', modelSize);
    } catch (fetchErr) {
      console.warn('[YOLO-World Worker] Could not verify model URL:', fetchErr);
    }
    
    // Skip ONNX session if model is placeholder (< 1MB)
    if (modelSize > 0 && modelSize < 1_000_000) {
      console.warn('[YOLO-World Worker] Model too small (placeholder), skipping ONNX init');
      modelLoaded = true;
      session = null;
      modelIsPlaceholder = true;
      return;
    }
    
    console.log('[YOLO-World Worker] Creating ONNX session with hardware acceleration fallback...');
    const accelerated = await createAcceleratedSession(
      ort,
      modelConfig.modelUrl,
      {
        graphOptimizationLevel: 'all',
        enableMemPattern: true,
        enableCpuMemArena: true,
        executionMode: 'sequential',
        logSeverityLevel: 2
      },
      'YOLO-World Worker'
    );

    session = accelerated.session;
    activeProvider = accelerated.provider;
    providerDescription = accelerated.description;
    console.log(`[YOLO-World Worker] ONNX session created successfully with [${activeProvider}]: ${providerDescription}`);

    needsTextFeatures = session.inputNames.length > 1;
    inputName = session.inputNames.find(n => !n.toLowerCase().includes('text')) ?? session.inputNames[0];
    textInputName = session.inputNames.find(n => n !== inputName) ?? '';
    scoresOutputName = session.outputNames.find(n => n.toLowerCase().includes('score')) ?? session.outputNames[0];
    boxesOutputName = session.outputNames.find(n => n.toLowerCase().includes('box') && n !== scoresOutputName)
      ?? (session.outputNames.length > 1 ? session.outputNames[1] : session.outputNames[0]);
    console.log(`[YOLO-World Worker] Inputs: ${session.inputNames.join(', ')} | Outputs: ${session.outputNames.join(', ')}`);

    modelLoaded = true;
    clipLoaded = false;
    console.log('YOLO-World model loaded (CLIP deferred):', modelConfig.modelUrl);
    
    // If concepts provided at init, load CLIP now
    if (modelConfig.classNames && modelConfig.classNames.length > 0) {
      await loadCLIPModel(modelConfig.clipModelUrl);
    }
  } catch (err) {
    console.error('[YOLO-World Worker] Model load failed:', err);
    modelLoaded = false;
    session = null;
    throw err;
  }
}

async function loadCLIPModel(clipModelUrl?: string): Promise<void> {
  if (clipLoaded || !clipModelUrl) return;

  try {
    console.log('[YOLO-World Worker] Loading CLIP model:', clipModelUrl);

    if (!tokenizer) {
      const [vocabRes, mergesRes] = await Promise.all([
        fetch('/models/clip-tokenizer/vocab.json'),
        fetch('/models/clip-tokenizer/merges.txt')
      ]);
      if (!vocabRes.ok || !mergesRes.ok) {
        throw new Error(`Tokenizer assets not found (${vocabRes.status}/${mergesRes.status})`);
      }
      tokenizer = new CLIPTokenizer(await vocabRes.json(), await mergesRes.text());
      console.log('[YOLO-World Worker] CLIP BPE tokenizer loaded');
    }

    const executionProviders = ['wasm'];

    clipSession = await ort.InferenceSession.create(clipModelUrl, {
      executionProviders,
      graphOptimizationLevel: 'all',
      enableMemPattern: true,
      enableCpuMemArena: true,
      executionMode: 'sequential'
    });

    clipInputName = clipSession.inputNames[0];
    clipOutputName = clipSession.outputNames.find(n => n.toLowerCase().includes('embed')) ?? clipSession.outputNames[0];
    clipLoaded = true;

    // Compute embeddings for current concepts
    await computeConceptEmbeddings();

    self.postMessage({ type: 'PROGRESS', msgId: 0, payload: { stage: 'clip_loaded', concepts: currentConcepts } });
  } catch (err) {
    console.warn('[YOLO-World Worker] CLIP model load failed, using default concepts:', err);
    clipLoaded = false;
    conceptEmbeddings = [];
  }
}

async function computeConceptEmbeddings(): Promise<void> {
  if (!clipLoaded || !clipSession || !tokenizer || currentConcepts.length === 0) {
    conceptEmbeddings = [];
    return;
  }

  try {
    const seqLen = 77;
    const numConcepts = currentConcepts.length;
    const flat = new BigInt64Array(numConcepts * seqLen);

    for (let c = 0; c < numConcepts; c++) {
      const prompt = `a photo of a ${currentConcepts[c]}`;
      const ids = tokenizer.encode(prompt, seqLen);
      for (let t = 0; t < seqLen; t++) {
        flat[c * seqLen + t] = BigInt(ids[t]);
      }
    }

    const inputTensor = new ort.Tensor('int64', flat, [numConcepts, seqLen]);
    const results = await clipSession.run({ [clipInputName]: inputTensor });
    const output = results[clipOutputName];
    const embedData = output.data as Float32Array;
    const dims = output.dims;
    const dim = dims[dims.length - 1];

    conceptEmbeddings = [];
    for (let i = 0; i < numConcepts; i++) {
      const emb = new Float32Array(dim);
      emb.set(embedData.slice(i * dim, (i + 1) * dim));

      let norm = 0;
      for (let j = 0; j < dim; j++) norm += emb[j] * emb[j];
      norm = Math.sqrt(norm);
      if (norm > 0) for (let j = 0; j < dim; j++) emb[j] /= norm;

      conceptEmbeddings.push(emb);
    }

    console.log('Computed embeddings for', numConcepts, 'concepts (dim', dim + ')');
  } catch (err) {
    console.warn('[YOLO-World Worker] Concept embedding computation failed:', err);
    conceptEmbeddings = [];
  }
}

function postprocessWorld(
  scores: Float32Array,
  scoreDims: readonly number[],
  boxes: Float32Array,
  confThreshold: number,
  iouThreshold: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  originalW: number,
  originalH: number
): Detection[] {
  if (!config) return [];

  const rank = scoreDims.length;
  const numAnchors = Number(scoreDims[rank - 2]);
  const numClasses = Number(scoreDims[rank - 1]);

  const detections: Detection[] = [];
  const invScale = scale !== 0 ? 1 / scale : 1;

  for (let i = 0; i < numAnchors; i++) {
    let bestConf = -Infinity;
    let classId = 0;
    for (let c = 0; c < numClasses; c++) {
      const conf = scores[i * numClasses + c];
      if (conf > bestConf) {
        bestConf = conf;
        classId = c;
      }
    }
    if (bestConf < confThreshold) continue;

    const x1 = boxes[i * 4];
    const y1 = boxes[i * 4 + 1];
    const x2 = boxes[i * 4 + 2];
    const y2 = boxes[i * 4 + 3];

    const fx1 = Math.max(0, Math.min((x1 - offsetX) * invScale, originalW));
    const fy1 = Math.max(0, Math.min((y1 - offsetY) * invScale, originalH));
    const fx2 = Math.max(0, Math.min((x2 - offsetX) * invScale, originalW));
    const fy2 = Math.max(0, Math.min((y2 - offsetY) * invScale, originalH));

    const w = fx2 - fx1;
    const h = fy2 - fy1;
    if (w <= 1 || h <= 1) continue;

    detections.push({
      bbox: [fx1, fy1, w, h],
      score: bestConf,
      class: currentConcepts[classId] || `concept_${classId}`,
      classId
    });
  }

  return applyNMSWithClass(detections, iouThreshold);
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
): Detection[] {
  if (!config) return [];
  
  const numClasses = currentConcepts.length;
  
  let isTransposed = false;
  let numBoxes = 0;
  let numDimensions = 0;
  let hasObjConf = false;

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
    numDimensions = 4 + numClasses;
    numBoxes = Math.floor(output.length / numDimensions);
    isTransposed = true; 
  }

  hasObjConf = (numDimensions === 4 + 1 + numClasses);
  
  const detections: Detection[] = [];
  const [inputW, inputH] = config.inputSize;
  
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
      const sigmoid =  (z: number) => 1 / (1 + Math.exp(-z));
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
        class: currentConcepts[classId] || `class_${classId}`,
        classId
      });
    }
  }
  
  return applyNMSWithClass(detections, iouThreshold);
}

self.onmessage = async (event: MessageEvent<{ type: string; payload?: any; msgId: number }>) => {
  const { type, payload, msgId } = event.data;

  if (type === 'INIT') {
    try {
      const modelConfig = {
        modelUrl: payload?.modelUrl || '/models/yoloworld.onnx',
        inputSize: payload?.inputSize || [640, 640],
        confidenceThreshold: payload?.confidenceThreshold || 0.3,
        iouThreshold: payload?.iouThreshold || 0.45,
        useWebGPU: payload?.useWebGPU !== false,
        clipModelUrl: payload?.clipModelUrl || '/models/clip_text_encoder.onnx',
        classNames: payload?.concepts || []
      };
      console.log('[YOLO-World Worker] INIT received, starting model load...');
      await initModel(modelConfig);
      if (modelIsPlaceholder) {
        self.postMessage({
          type: 'ERROR',
          msgId,
          payload: {
            error: 'Open-vocab models not installed (placeholder stubs detected). Run "node scripts/download-models.js" to fetch yoloworld.onnx + clip_text_encoder.onnx, then reload.'
          }
        });
        console.warn('[YOLO-World Worker] Placeholder model detected — open mode disabled until full models are downloaded');
        return;
      }
      if (needsTextFeatures) {
        console.log('[YOLO-World Worker] Multi-input export — CLIP text embeddings will be computed from concepts');
      }
      self.postMessage({ type: 'READY', msgId, payload: { concepts: currentConcepts, clipLoaded: false } });
      console.log('[YOLO-World Worker] Model ready, sent READY');
    } catch (err) {
      console.error('[YOLO-World Worker] INIT failed:', err);
      self.postMessage({ type: 'ERROR', msgId, payload: { error: String(err) } });
    }
  }

  if (type === 'DETECT') {
    if (!modelLoaded) {
      self.postMessage({ type: 'DETECTION_RESULT', msgId, payload: { results: [], inferenceMs: 0, error: 'Model not loaded' } });
      return;
    }
    if (modelIsPlaceholder || !session) {
      self.postMessage({ type: 'DETECTION_RESULT', msgId, payload: { results: [], inferenceMs: 0, error: 'YOLO-World model is a placeholder — run scripts/download-models.js' } });
      return;
    }
    if (needsTextFeatures && conceptEmbeddings.length === 0) {
      self.postMessage({ type: 'DETECTION_RESULT', msgId, payload: { results: [], inferenceMs: 0, error: 'No concepts set — CLIP text embeddings not ready yet' } });
      return;
    }
    
    const { imageData, buffer, width, height, originalWidth, originalHeight, scale, offsetX, offsetY, confidenceThreshold, iouThreshold } = payload;
    const threshold = confidenceThreshold ?? config?.confidenceThreshold ?? 0.3;
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
      const start = performance.now();
      const [inputW, inputH] = config!.inputSize;
      const numPixels = inputW * inputH;
      const planarData = new Float32Array(3 * numPixels);

      if (buffer) {
        const u8 = new Uint8Array(buffer);
        const rOffset = 0;
        const gOffset = numPixels;
        const bOffset = numPixels * 2;
        const inv255 = 1 / 255;
        
        for (let i = 0, p = 0; i < numPixels; i++, p += 4) {
          planarData[rOffset + i] = u8[p] * inv255;
          planarData[gOffset + i] = u8[p + 1] * inv255;
          planarData[bOffset + i] = u8[p + 2] * inv255;
        }
      } else if (imageData) {
        const inputData = preprocessImage(imageData, config!.inputSize);
        planarData.set(inputData);
      }
      
      const inputTensor = new ort.Tensor('float32', planarData, [1, 3, inputH, inputW]);

      const feeds: Record<string, ort.Tensor> = { [inputName]: inputTensor };
      if (needsTextFeatures && textInputName) {
        const numConcepts = conceptEmbeddings.length;
        const dim = numConcepts > 0 ? conceptEmbeddings[0].length : 0;
        if (numConcepts === 0 || dim === 0) {
          self.postMessage({ type: 'DETECTION_RESULT', msgId, payload: { results: [], inferenceMs: 0, error: 'Concept embeddings unavailable' } });
          return;
        }
        const tf = new Float32Array(numConcepts * dim);
        for (let c = 0; c < numConcepts; c++) tf.set(conceptEmbeddings[c], c * dim);
        feeds[textInputName] = new ort.Tensor('float32', tf, [1, numConcepts, dim]);
      }

      const results = await session!.run(feeds);
      const origW = originalWidth || imageData?.width || inputW;
      const origH = originalHeight || imageData?.height || inputH;

      let detections: Detection[];
      const inferenceMs = performance.now() - start;

      if (scoresOutputName !== boxesOutputName && needsTextFeatures) {
        const scoresOut = results[scoresOutputName];
        const boxesOut = results[boxesOutputName];
        detections = postprocessWorld(
          scoresOut.data as Float32Array,
          scoresOut.dims,
          boxesOut.data as Float32Array,
          threshold,
          iouThresh,
          scale ?? Math.min(inputW / origW, inputH / origH),
          offsetX ?? (inputW - Math.round(origW * (scale ?? 1))) / 2,
          offsetY ?? (inputH - Math.round(origH * (scale ?? 1))) / 2,
          origW,
          origH
        );
      } else {
        const output = results[outputName].data as Float32Array;
        const dims = results[outputName].dims;
        detections = postprocess(output, dims, origW, origH, threshold, iouThresh, scale, offsetX, offsetY);
      }
      
      self.postMessage({
        type: 'DETECTION_RESULT',
        msgId,
        payload: { results: detections, inferenceMs }
      });
    } catch (err) {
      console.error('[YOLO-World Worker] Detection failed:', err);
      self.postMessage({
        type: 'DETECTION_RESULT',
        msgId,
        payload: { results: [], inferenceMs: 0, error: String(err) }
      });
    }
  }

  if (type === 'SET_CONCEPTS') {
    if (payload?.concepts && payload.concepts.length > 0) {
      currentConcepts = payload.concepts;
      
      // Load CLIP model lazily on first concept set
      if (!clipLoaded && config?.clipModelUrl) {
        self.postMessage({ type: 'PROGRESS', msgId, payload: { stage: 'clip_loading', message: 'Loading CLIP text encoder...' } });
        await loadCLIPModel(config.clipModelUrl);
      } else {
        await computeConceptEmbeddings();
      }
      
      self.postMessage({ type: 'READY', msgId, payload: { concepts: currentConcepts, clipLoaded } });
    } else {
      self.postMessage({ type: 'READY', msgId, payload: { concepts: [], clipLoaded: false } });
    }
  }
};