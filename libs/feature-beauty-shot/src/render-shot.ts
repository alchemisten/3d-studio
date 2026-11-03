import { WebGPURenderer } from 'three/webgpu';
import { WebGPUPathTracer } from 'three-gpu-pathtracer/webgpu';
import { denoiseImage } from './denoise-image';
import type { Shot } from './capture-source';

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const encode = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) =>
  canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not save the image.'))),
);

export const renderShot = async (
  canvas: HTMLCanvasElement,
  shot: Shot,
  samples: number,
  denoise: boolean,
  signal: AbortSignal,
  status: (value: string, progress?: { fraction: number; seconds?: number }) => void,
) => {
  signal.throwIfAborted();
  const renderer = new WebGPURenderer({ canvas });
  let tracer: WebGPUPathTracer | undefined;
  let gpuError: Error | undefined;
  renderer.onDeviceLost = () => {
    gpuError = new Error('Graphics device disconnected. Try again.');
  };
  try {
    await renderer.init();
    signal.throwIfAborted();
    if (!('isWebGPUBackend' in renderer.backend)) throw new Error('This browser could not start WebGPU.');
    renderer.setSize(shot.width, shot.height, false);
    renderer.toneMapping = shot.toneMapping;
    renderer.toneMappingExposure = shot.exposure;
    tracer = new WebGPUPathTracer(renderer);
    tracer.maxSamples = samples;
    tracer.dynamicLowRes = false;
    tracer.minSamples = 1;
    tracer.fadeDuration = 0;
    tracer.renderDelay = 0;
    tracer.addEventListener('progress', (event) => {
      if (event.stage !== 'rendering' || !event.samples) return;
      const { avg, samplesPerSecond } = event.samples;
      status('Rendering', {
        fraction: Math.min(1, avg / samples) * (denoise ? 0.99 : 1),
        seconds:
          samplesPerSecond > 0 && avg > 0 ? Math.max(1, Math.ceil((samples - avg) / samplesPerSecond)) : undefined,
      });
    });
    tracer.setScene(shot.scene, shot.camera);
    status('Rendering...');
    do {
      await frame();
      signal.throwIfAborted();
      if (gpuError) throw gpuError;
      tracer.renderSample();
    } while (!tracer.complete);
    const image = document.createElement('canvas');
    image.width = canvas.width;
    image.height = canvas.height;
    const context = image.getContext('2d');
    if (!context) throw new Error('Could not read the rendered image.');
    context.drawImage(canvas, 0, 0);
    let original: Blob | undefined;
    if (denoise) {
      status('Denoising...', { fraction: 0.99 });
      original = await encode(image);
      await frame();
      signal.throwIfAborted();
      const pixels = context.getImageData(0, 0, image.width, image.height);
      context.putImageData(await denoiseImage(pixels, signal), 0, 0);
    }
    return { original, result: await encode(image) };
  } finally {
    tracer?.dispose();
    await renderer.dispose();
  }
};
