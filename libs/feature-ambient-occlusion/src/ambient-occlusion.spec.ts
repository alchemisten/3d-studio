import { describe, expect, it } from 'vitest';
import { resolveFeatureConfig, ViewerStore } from '@schablone/3d-studio-core';
import { ambientOcclusion } from './ambient-occlusion';
import { resolveAmbientOcclusionLabels } from './ambient-occlusion-labels';
import { AMBIENT_OCCLUSION_ID } from './config';
import { occlusionLevel, occlusionQuality } from './occlusion-level';
import { createRestTracker } from './rest-tracker';

describe('ambient occlusion config', () => {
  it('defaults to an enabled, automatic effect that waits for the view to rest', () => {
    expect(resolveFeatureConfig({ feature: ambientOcclusion })).toMatchObject({
      enabled: true,
      mode: 'auto',
      intensity: 1,
      whenResting: true,
      locale: 'en',
    });
  });

  it('rejects unknown modes', () => {
    expect(() => resolveFeatureConfig({ feature: ambientOcclusion, props: { mode: 'always' as never } })).toThrow();
  });

  it('seeds the mode once and keeps a mode chosen before', () => {
    const viewer = new ViewerStore();
    const context = {
      id: AMBIENT_OCCLUSION_ID,
      viewer,
      overlay: {} as never,
      config: resolveFeatureConfig({ feature: ambientOcclusion, props: { mode: 'on' } }),
    };
    ambientOcclusion.setup?.(context);
    expect(viewer.getState().featureState[AMBIENT_OCCLUSION_ID]).toBe('on');
    viewer.setFeatureState(AMBIENT_OCCLUSION_ID, 'off');
    ambientOcclusion.setup?.(context);
    expect(viewer.getState().featureState[AMBIENT_OCCLUSION_ID]).toBe('off');
  });

  it('offers no menu entry and no query setting while disabled', () => {
    const context = {
      id: AMBIENT_OCCLUSION_ID,
      viewer: new ViewerStore(),
      overlay: {} as never,
      config: resolveFeatureConfig({ feature: ambientOcclusion, props: { enabled: false } }),
    };
    expect(typeof ambientOcclusion.slots === 'function' && ambientOcclusion.slots(context)).toEqual({});
    expect(ambientOcclusion.querySettings?.(context)).toEqual([]);
  });
});

describe('occlusionLevel', () => {
  it('follows the quality tier in auto mode', () => {
    expect(occlusionLevel(true, 'auto', 'high')).toBe('high');
    expect(occlusionLevel(true, 'auto', 'reduced')).toBe('reduced');
    expect(occlusionLevel(true, 'auto', 'off')).toBe('off');
  });

  it('ignores the tier when switched on or off', () => {
    expect(occlusionLevel(true, 'on', 'off')).toBe('high');
    expect(occlusionLevel(true, 'off', 'high')).toBe('off');
    expect(occlusionLevel(false, 'on', 'high')).toBe('off');
  });

  it('renders the reduced level at half resolution with fewer samples', () => {
    expect(occlusionQuality.reduced.resolutionScale).toBe(0.5);
    expect(occlusionQuality.reduced.samples).toBeLessThan(occlusionQuality.high.samples);
  });
});

describe('createRestTracker', () => {
  const pose = (x: number) => [x, 0, 0, 1];

  it('rests once the pose has kept still for the delay', () => {
    const tracker = createRestTracker(100);
    expect(tracker.update(pose(0), 0, false)).toEqual({ hasMoved: true, isResting: false, restedFor: 0, wait: 100 });
    expect(tracker.update(pose(0), 60, false)).toMatchObject({ hasMoved: false, isResting: false, wait: 40 });
    expect(tracker.update(pose(0), 100, false)).toMatchObject({ isResting: true, restedFor: 0 });
    expect(tracker.update(pose(0), 190, false)).toMatchObject({ isResting: true, restedFor: 90 });
  });

  it('starts over when the camera moves', () => {
    const tracker = createRestTracker(100);
    tracker.update(pose(0), 0, false);
    tracker.update(pose(0), 150, false);
    expect(tracker.update(pose(1), 160, false)).toMatchObject({ isResting: false, wait: 100 });
    expect(tracker.update(pose(1), 260, false).isResting).toBe(true);
  });

  it('takes changes below the tolerance per frame as still', () => {
    const tracker = createRestTracker(100, 1e-3);
    tracker.update(pose(1), 0, false);
    expect(tracker.update(pose(1.0005), 120, false)).toMatchObject({ hasMoved: false, isResting: true });
    expect(tracker.update(pose(1.001), 130, false)).toMatchObject({ hasMoved: false, isResting: true });
    expect(tracker.update(pose(1.01), 140, false)).toMatchObject({ hasMoved: true, isResting: false });
  });

  it('does not rest while the user interacts', () => {
    const tracker = createRestTracker(100);
    tracker.update(pose(0), 0, true);
    expect(tracker.update(pose(0), 500, true).isResting).toBe(false);
    expect(tracker.update(pose(0), 550, false).isResting).toBe(false);
    expect(tracker.update(pose(0), 600, false).isResting).toBe(true);
  });
});

describe('resolveAmbientOcclusionLabels', () => {
  it('ships German and falls back to English', () => {
    expect(resolveAmbientOcclusionLabels('de').auto).toBe('Automatisch');
    expect(resolveAmbientOcclusionLabels('fr').title).toBe('Ambient occlusion');
    expect(resolveAmbientOcclusionLabels('en', { title: 'AO' }).title).toBe('AO');
  });
});
