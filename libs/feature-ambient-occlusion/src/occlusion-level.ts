import type { QualityTier } from '@schablone/3d-studio-core';
import type { AmbientOcclusionMode } from './config';

/** What is rendered: nothing, the half-resolution variant or the full effect. */
export type OcclusionLevel = 'off' | 'reduced' | 'high';

export interface OcclusionQuality {
  /** Size of the occlusion buffers relative to the drawing buffer. */
  resolutionScale: number;
  samples: number;
  denoiseSamples: number;
  /** Denoise reach in pixels of the occlusion buffer. */
  denoiseRadius: number;
  denoisePasses: 1 | 2;
}

export const occlusionQuality: Record<Exclude<OcclusionLevel, 'off'>, OcclusionQuality> = {
  high: { resolutionScale: 1, samples: 16, denoiseSamples: 16, denoiseRadius: 8, denoisePasses: 2 },
  reduced: { resolutionScale: 0.5, samples: 8, denoiseSamples: 16, denoiseRadius: 6, denoisePasses: 2 },
};

export const occlusionLevel = (isEnabled: boolean, mode: AmbientOcclusionMode, tier: QualityTier): OcclusionLevel => {
  if (!isEnabled || mode === 'off') return 'off';
  return mode === 'on' ? 'high' : tier;
};
