import { finishPixels } from './finish-pixels';

globalThis.onmessage = ({ data }: MessageEvent<ImageData>) => {
  const result = finishPixels(data, true);
  globalThis.postMessage(result, { transfer: [result.data.buffer] });
};
