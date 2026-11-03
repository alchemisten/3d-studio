const kernel = [1, 2, 1];

export const finishPixels = (image: ImageData, denoise: boolean) => {
  if (!denoise) return image;
  const { width, height, data } = image;
  let source = data.slice();
  let target = data;

  for (const step of [1, 2, 3]) {
    const range = 48 / Math.sqrt(step);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const center = 4 * (y * width + x);
        let red = 0;
        let green = 0;
        let blue = 0;
        let total = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const row = Math.min(height - 1, Math.max(0, y + dy * step)) * width;
          for (let dx = -1; dx <= 1; dx++) {
            const i = 4 * (row + Math.min(width - 1, Math.max(0, x + dx * step)));
            const distance = ((source[i] - source[center]) ** 2 + (source[i + 1] - source[center + 1]) ** 2 + (source[i + 2] - source[center + 2]) ** 2) / (3 * range * range);
            const weight = kernel[dy + 1] * kernel[dx + 1] / (1 + distance) ** 3;
            red += weight * source[i];
            green += weight * source[i + 1];
            blue += weight * source[i + 2];
            total += weight;
          }
        }
        target[center] = red / total;
        target[center + 1] = green / total;
        target[center + 2] = blue / total;
      }
    }
    const previous = source;
    source = target;
    target = previous;
  }
  return image;
};

