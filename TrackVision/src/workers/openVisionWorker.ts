import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;
if (env.backends.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.simd = true;
}

let detector: any = null;
let status = 'idle';

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === 'INITIALIZE') {
    if (detector) {
      self.postMessage({ type: 'STATUS', payload: { status: 'ready', model: 'owlvit-base-patch32' } });
      return;
    }

    try {
      status = 'loading';
      self.postMessage({ type: 'STATUS', payload: { status } });
      
      detector = await pipeline('zero-shot-object-detection', 'Xenova/owlvit-base-patch32', {
        device: 'wasm',
        dtype: 'fp32',
      });

      status = 'ready';
      self.postMessage({ type: 'STATUS', payload: { status, model: 'Xenova/owlvit-base-patch32', device: 'wasm' } });
    } catch (err) {
      console.error("OwlViT initialization failed:", err);
      status = 'error';
      self.postMessage({ type: 'STATUS', payload: { status, error: String(err) } });
    }
  }

  if (type === 'DETECT') {
    if (!detector || status !== 'ready') {
      self.postMessage({
        type: 'DETECTION_RESULT',
        payload: { msgId: payload.msgId, results: [], inferenceMs: 0 }
      });
      return;
    }
    
    const { imageBlob, concepts, threshold, msgId } = payload;
    
    try {
      const imageUrl = URL.createObjectURL(imageBlob);
      const start = performance.now();
      
      const results = await detector(imageUrl, concepts, {
        threshold: threshold || 0.1,
        percentage: true
      });
      
      const inferenceMs = performance.now() - start;
      URL.revokeObjectURL(imageUrl);

      self.postMessage({
        type: 'DETECTION_RESULT',
        payload: { msgId, results, inferenceMs }
      });
    } catch (err) {
      console.error('Detection failed:', err);
      self.postMessage({
        type: 'DETECTION_RESULT',
        payload: { msgId, results: [], inferenceMs: 0, error: String(err) }
      });
    }
  }
};