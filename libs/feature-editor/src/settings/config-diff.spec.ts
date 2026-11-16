import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { gridIndex } from '../materials/material-browser';
import { deepEqual, diffConfig } from './config-diff';
import { nextColorId } from './tint-fields';

describe('deepEqual', () => {
  it('compares JSON-like values structurally', () => {
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(Number.NaN, Number.NaN)).toBe(true);
  });

  it('compares class instances and functions by identity', () => {
    const vector = new Vector3();
    const run = () => undefined;
    expect(deepEqual({ vector, run }, { vector, run })).toBe(true);
    expect(deepEqual(new Vector3(), new Vector3())).toBe(false);
  });
});

describe('diffConfig', () => {
  const baseline = { enabled: false, speed: 2, presets: [{ id: 'quick' }], locale: 'en' };

  it('keeps only the keys that differ from the baseline', () => {
    expect(diffConfig(baseline, { ...baseline, enabled: true })).toEqual({ enabled: true });
    expect(diffConfig(baseline, { ...baseline, presets: [{ id: 'quick' }] })).toEqual({});
    expect(diffConfig(baseline, { ...baseline, presets: [{ id: 'high' }] })).toEqual({ presets: [{ id: 'high' }] });
  });

  it('drops an override that is set back to its default', () => {
    const edited = { ...baseline, ...diffConfig(baseline, { ...baseline, speed: 4 }) };
    expect(diffConfig(baseline, { ...edited, speed: 2 })).toEqual({});
  });

  it('keeps keys the baseline does not know and ignores undefined values', () => {
    expect(diffConfig(baseline, { ...baseline, highlights: [{ id: 'a' }], color: undefined })).toEqual({
      highlights: [{ id: 'a' }],
    });
  });
});

describe('ids and grid keys', () => {
  it('finds the smallest unused colour id', () => {
    expect(nextColorId([])).toBe('color-1');
    expect(nextColorId([{ id: 'color-1' }, { id: 'sage' }])).toBe('color-2');
    expect(nextColorId([{ id: 'color-2' }])).toBe('color-1');
  });

  it('moves through a grid of swatches and stops at its edges', () => {
    expect(gridIndex('ArrowRight', 0, 7, 3)).toBe(1);
    expect(gridIndex('ArrowDown', 1, 7, 3)).toBe(4);
    expect(gridIndex('ArrowUp', 4, 7, 3)).toBe(1);
    expect(gridIndex('ArrowDown', 5, 7, 3)).toBe(5);
    expect(gridIndex('ArrowLeft', 0, 7, 3)).toBe(0);
    expect(gridIndex('End', 0, 7, 3)).toBe(6);
    expect(gridIndex('Home', 6, 7, 3)).toBe(0);
    expect(gridIndex('a', 0, 7, 3)).toBeUndefined();
  });
});
