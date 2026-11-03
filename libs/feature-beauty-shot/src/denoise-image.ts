import DenoiseWorker from './denoise.worker?worker&inline';

export const denoiseImage = async (pixels: ImageData, signal: AbortSignal) => {
  signal.throwIfAborted();
  const worker = new DenoiseWorker();
  let abort: (() => void) | undefined;
  try {
    return await new Promise<ImageData>((resolve, reject) => {
      abort = () => reject(signal.reason);
      signal.addEventListener('abort', abort, { once: true });
      worker.onmessage = (event: MessageEvent<ImageData>) => resolve(event.data);
      worker.onerror = event => reject(new Error(event.message || 'Denoising failed.'));
      worker.postMessage(pixels, [pixels.data.buffer]);
    });
  } finally {
    if (abort) signal.removeEventListener('abort', abort);
    worker.terminate();
  }
};
