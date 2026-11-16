import { toAbsoluteUrl } from './ar-links';

export interface ArDimensions {
  height: number;
  length: number;
  width: number;
}

export interface ArAssetSource {
  dimensionsMm?: ArDimensions;
  glb: string;
  stageUrl: string;
  usdz?: string;
}

export interface ArAsset {
  dimensionsMm?: ArDimensions;
  glb: string;
  /** Absent when the USDZ is only prepared on demand, or not offered at all. */
  usdz?: string;
}

/**
 * Quick Look and Scene Viewer fetch the files themselves, outside the page, so
 * they need absolute urls. Relative ones resolve against the stage.
 */
export const resolveArAsset = ({ dimensionsMm, glb, stageUrl, usdz }: ArAssetSource): ArAsset => ({
  ...(dimensionsMm ? { dimensionsMm } : {}),
  glb: toAbsoluteUrl(glb, stageUrl),
  ...(usdz ? { usdz: toAbsoluteUrl(usdz, stageUrl) } : {}),
});

export const formatDimensions = (dimensions: ArDimensions | undefined): string | null =>
  dimensions ? `${dimensions.length} × ${dimensions.width} × ${dimensions.height} mm` : null;
