import { describe, expect, it } from 'vitest';
import { createFrameChain } from './frame-chain';
import { createQualityMonitor, type QualityMonitor } from './quality-monitor';

const feed = (monitor: QualityMonitor, frameMs: number, count: number) => {
  for (let index = 0; index < count; index += 1) monitor.sample(frameMs);
  return monitor.state;
};

const FPS_60 = 1000 / 60;
const FPS_45 = 1000 / 45;
const FPS_35 = 1000 / 35;
const FPS_20 = 1000 / 20;

describe('createQualityMonitor', () => {
  it('starts off and rises to high only after a whole window at the promote rate', () => {
    const monitor = createQualityMonitor({ warmupFrames: 0 });
    expect(monitor.state).toEqual({ tier: 'off', demoted: false, fixed: false });
    expect(feed(monitor, FPS_60, 59).tier).toBe('off');
    const state = feed(monitor, FPS_60, 2);
    expect(state.tier).toBe('high');
    expect(state.fps).toBeCloseTo(60, 0);
    expect(state.demoted).toBe(false);
  });

  it('leaves the warm-up frames out', () => {
    const monitor = createQualityMonitor({ warmupFrames: 20 });
    feed(monitor, 400, 20);
    expect(monitor.state.fps).toBeUndefined();
    expect(feed(monitor, FPS_60, 61).tier).toBe('high');
  });

  it('stays off below the promote rate and may still rise later', () => {
    const monitor = createQualityMonitor({ warmupFrames: 0 });
    const slow = feed(monitor, FPS_45, 46);
    expect(slow.tier).toBe('off');
    expect(slow.fps).toBeCloseTo(45, 0);
    expect(slow.demoted).toBe(false);
    expect(feed(monitor, FPS_60, 61).tier).toBe('high');
  });

  it('drops to reduced below the reduced rate and to off below the off rate', () => {
    const monitor = createQualityMonitor({ warmupFrames: 0 });
    feed(monitor, FPS_60, 61);
    const reduced = feed(monitor, FPS_35, 36);
    expect(reduced).toMatchObject({ tier: 'reduced', demoted: true });
    expect(feed(monitor, FPS_35, 36).tier).toBe('reduced');
    expect(feed(monitor, FPS_20, 21)).toMatchObject({ tier: 'off', demoted: true });
  });

  it('drops from high straight to off below the off rate', () => {
    const monitor = createQualityMonitor({ warmupFrames: 0 });
    feed(monitor, FPS_60, 61);
    expect(feed(monitor, FPS_20, 21)).toMatchObject({ tier: 'off', demoted: true });
  });

  it('never rises again after a drop', () => {
    const monitor = createQualityMonitor({ warmupFrames: 0 });
    feed(monitor, FPS_60, 61);
    feed(monitor, FPS_35, 36);
    expect(feed(monitor, FPS_60, 600).tier).toBe('reduced');
    feed(monitor, FPS_20, 21);
    expect(feed(monitor, FPS_60, 600).tier).toBe('off');
  });

  it('does not drop for a single hitch in an otherwise fast window', () => {
    const monitor = createQualityMonitor({ warmupFrames: 0 });
    feed(monitor, FPS_60, 61);
    feed(monitor, FPS_60, 30);
    monitor.sample(600);
    expect(monitor.state.tier).toBe('high');
    expect(monitor.state.fps).toBeCloseTo(60, 0);
  });

  it('leaves out the frames after a tier change', () => {
    const monitor = createQualityMonitor({ warmupFrames: 10 });
    feed(monitor, FPS_60, 71);
    expect(monitor.state.tier).toBe('high');
    feed(monitor, 500, 10);
    expect(monitor.state.tier).toBe('high');
    expect(feed(monitor, FPS_60, 61).tier).toBe('high');
  });

  it('keeps coarse pointer devices off unless they are measured', () => {
    const coarse = createQualityMonitor({ warmupFrames: 0 }, true);
    expect(coarse.state).toEqual({ tier: 'off', demoted: false, fixed: true });
    expect(feed(coarse, FPS_60, 600).tier).toBe('off');
    const measured = createQualityMonitor({ warmupFrames: 0, coarsePointer: 'measure' }, true);
    expect(feed(measured, FPS_60, 61).tier).toBe('high');
  });

  it('keeps a configured tier', () => {
    const monitor = createQualityMonitor({ tier: 'high', warmupFrames: 0 }, true);
    expect(feed(monitor, FPS_20, 600)).toEqual({ tier: 'high', demoted: false, fixed: true });
  });

  it('applies configured thresholds', () => {
    const monitor = createQualityMonitor({
      warmupFrames: 0,
      promoteFps: 25,
      reducedFps: 15,
      offFps: 10,
      windowMs: 500,
    });
    expect(feed(monitor, FPS_35, 18).tier).toBe('high');
    expect(feed(monitor, FPS_20, 11).tier).toBe('high');
    expect(feed(monitor, 1000 / 12, 7).tier).toBe('reduced');
    expect(feed(monitor, 1000 / 8, 5).tier).toBe('off');
  });

  it('rejects thresholds in the wrong order', () => {
    expect(() => createQualityMonitor({ promoteFps: 30, reducedFps: 40 })).toThrow(RangeError);
  });

  it('warms up again on request and keeps the tier', () => {
    const monitor = createQualityMonitor({ warmupFrames: 5 });
    feed(monitor, FPS_60, 66);
    monitor.warmUp();
    feed(monitor, 500, 5);
    expect(monitor.state.tier).toBe('high');
  });
});

describe('createFrameChain', () => {
  it('yields frame times only between frames of consecutive refreshes', () => {
    const chain = createFrameChain();
    expect(chain.rendered(0)).toBeNull();
    expect(chain.refreshed()).toBe(true);
    expect(chain.rendered(16)).toBe(16);
    expect(chain.refreshed()).toBe(true);
    expect(chain.refreshed()).toBe(false);
    expect(chain.rendered(500)).toBeNull();
    expect(chain.rendered(517)).toBe(17);
  });

  it('starts over after an interruption', () => {
    const chain = createFrameChain();
    chain.rendered(0);
    chain.interrupt();
    expect(chain.rendered(5000)).toBeNull();
  });
});
