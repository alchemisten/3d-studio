/** How much rendering extras the device affords: all of them, cheaper variants, or none. */
export type QualityTier = 'high' | 'reduced' | 'off';

export interface QualityThresholds {
  /** Frames per second a whole window must reach before the tier is raised to `high`. */
  promoteFps: number;
  /** Below this average the tier drops to `reduced`. */
  reducedFps: number;
  /** Below this average the tier drops to `off`. */
  offFps: number;
  /** Rendered frame time in milliseconds one average is taken over. */
  windowMs: number;
  /** Rendered frames left out after load and after every tier change (shader compiles, uploads). */
  warmupFrames: number;
}

export interface QualityOptions extends Partial<QualityThresholds> {
  /** Fixes the tier and switches measuring off. */
  tier?: QualityTier;
  /** Devices with a coarse pointer (phones, tablets) stay `off` unless this is `measure`. */
  coarsePointer?: 'off' | 'measure';
}

export interface QualityState {
  tier: QualityTier;
  /** Average of the last measured window; `undefined` until one window is complete. */
  fps?: number;
  /** The tier was lowered once; it is never raised again in this session. */
  demoted: boolean;
  /** The tier is set by configuration or device class and not measured. */
  fixed: boolean;
}

export const defaultQualityThresholds: QualityThresholds = {
  promoteFps: 50,
  reducedFps: 40,
  offFps: 30,
  windowMs: 1000,
  warmupFrames: 20,
};

export const initialQualityState: QualityState = { tier: 'off', demoted: false, fixed: false };

export interface QualityMonitor {
  readonly state: QualityState;
  /** Feeds the time between two frames rendered directly after each other. Returns the state after it. */
  sample(frameMs: number): QualityState;
  /** Leaves out the next frames again, e.g. after a new model was loaded. Keeps tier and demotion. */
  warmUp(): void;
}

const MIN_TRIMMED_FRAMES = 5;

const resolveThresholds = (options: QualityOptions): QualityThresholds => {
  const merged = { ...defaultQualityThresholds };
  for (const key of Object.keys(defaultQualityThresholds) as (keyof QualityThresholds)[]) {
    const value = options[key];
    if (value !== undefined) merged[key] = value;
  }
  if (!(merged.promoteFps >= merged.reducedFps && merged.reducedFps >= merged.offFps && merged.offFps > 0)) {
    throw new RangeError('Quality thresholds must satisfy promoteFps >= reducedFps >= offFps > 0.');
  }
  if (!(merged.windowMs > 0) || merged.warmupFrames < 0) {
    throw new RangeError('Quality windowMs must be positive and warmupFrames must not be negative.');
  }
  return merged;
};

/**
 * Derives a quality tier from frame times. It starts at `off`, rises to `high` after one whole window
 * at `promoteFps` or more, drops to `reduced` or `off` when a window averages below their thresholds
 * and never rises again after a drop. The slowest frame of a window counts as a hitch and is left out.
 */
export const createQualityMonitor = (options: QualityOptions = {}, isCoarsePointer = false): QualityMonitor => {
  const thresholds = resolveThresholds(options);
  const fixedTier = options.tier ?? (isCoarsePointer && options.coarsePointer !== 'measure' ? 'off' : undefined);
  let state: QualityState = fixedTier ? { tier: fixedTier, demoted: false, fixed: true } : { ...initialQualityState };
  let skip = thresholds.warmupFrames;
  let frames: number[] = [];
  let elapsed = 0;

  const startWindow = () => {
    frames = [];
    elapsed = 0;
  };

  const windowFps = (): number => {
    const slowest = Math.max(...frames);
    const isTrimmed = frames.length >= MIN_TRIMMED_FRAMES;
    const count = isTrimmed ? frames.length - 1 : frames.length;
    const time = isTrimmed ? elapsed - slowest : elapsed;
    return (count * 1000) / time;
  };

  const tierAfter = (fps: number): QualityTier => {
    if (state.tier === 'off') return !state.demoted && fps >= thresholds.promoteFps ? 'high' : 'off';
    if (fps < thresholds.offFps) return 'off';
    if (fps < thresholds.reducedFps) return 'reduced';
    return state.tier;
  };

  return {
    get state() {
      return state;
    },
    sample: (frameMs) => {
      if (state.fixed || (state.demoted && state.tier === 'off') || !(frameMs > 0)) return state;
      if (skip > 0) {
        skip -= 1;
        return state;
      }
      frames.push(frameMs);
      elapsed += frameMs;
      if (elapsed < thresholds.windowMs) return state;
      const fps = windowFps();
      const tier = tierAfter(fps);
      const isLowered = tier !== state.tier && state.tier !== 'off';
      if (tier !== state.tier) skip = thresholds.warmupFrames;
      state = { ...state, tier, fps, demoted: state.demoted || isLowered };
      startWindow();
      return state;
    },
    warmUp: () => {
      skip = thresholds.warmupFrames;
      startWindow();
    },
  };
};
