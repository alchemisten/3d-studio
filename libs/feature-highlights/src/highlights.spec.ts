import { resolveFeatureConfig } from '@schablone/3d-studio-core';
import { Group, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { highlightLabel, highlights, isHighlightVisible, resolveAnchor, type Highlight } from './index';

const base: Highlight = { id: 'h', anchor: { position: [0, 0, 0] }, camera: { position: [1, 1, 1] } };

describe('anchors', () => {
  it('returns static world positions', () => {
    expect(resolveAnchor({ position: [1, 2, 3] }, undefined, new Vector3()).toArray()).toEqual([1, 2, 3]);
  });

  it('follows a node and applies its local offset', () => {
    const root = new Group();
    const node = new Object3D();
    node.name = 'door';
    root.add(node);
    node.position.set(10, 0, 0);
    node.rotation.y = Math.PI / 2;
    const out = new Vector3();
    resolveAnchor({ node: 'door', offset: [0, 0, 1] }, root, out);
    expect(out.x).toBeCloseTo(11);
    expect(out.z).toBeCloseTo(0);
    node.position.set(20, 0, 0);
    resolveAnchor({ node: 'door' }, root, out);
    expect(out.x).toBeCloseTo(20);
  });

  it('falls back to the origin for missing nodes', () => {
    expect(resolveAnchor({ node: 'missing' }, new Group(), new Vector3(5, 5, 5)).toArray()).toEqual([0, 0, 0]);
  });
});

describe('visibility', () => {
  const windowed: Highlight = { ...base, visibility: { from: 1, to: 2 } };
  it('is always visible without a window or animation', () => {
    expect(isHighlightVisible(base, { time: 99, playing: true })).toBe(true);
    expect(isHighlightVisible(windowed, undefined)).toBe(true);
  });
  it('respects the time window', () => {
    expect(isHighlightVisible(windowed, { time: 1.5, playing: false })).toBe(true);
    expect(isHighlightVisible(windowed, { time: 3, playing: false })).toBe(false);
  });
  it('can hide while playing', () => {
    const hidden = { ...base, visibility: { from: 0, to: 5, whenPlaying: false } };
    expect(isHighlightVisible(hidden, { time: 1, playing: true })).toBe(false);
    expect(isHighlightVisible(hidden, { time: 1, playing: false })).toBe(true);
  });
});

describe('highlights feature', () => {
  it('reads ALCM_highlights from the glTF extension', () => {
    const config = resolveFeatureConfig({
      feature: highlights,
      gltfExtensions: { ALCM_highlights: { highlights: [base] } },
    });
    expect(config.highlights).toHaveLength(1);
    expect(config).toMatchObject({ enabled: true, detail: true });
  });

  it('falls back to the id and picks labels by locale', () => {
    expect(highlightLabel(base, 'en')).toBe('h');
    expect(highlightLabel({ ...base, label: { de: 'Tür', en: 'Door' } }, 'de')).toBe('Tür');
    expect(highlightLabel({ ...base, label: { de: 'Tür' } }, 'fr')).toBe('Tür');
  });

  it('fills the hotspot layer and detail region', () => {
    const config = resolveFeatureConfig({ feature: highlights, props: { highlights: [base] } });
    const slots = highlights.slots as (ctx: { config: typeof config }) => Record<string, unknown>;
    expect(Object.keys(slots({ config }))).toEqual(['viewer.layer', 'overlay.bottom-left']);
    const without = resolveFeatureConfig({ feature: highlights, props: { detail: false } });
    expect(Object.keys(slots({ config: without }))).toEqual(['viewer.layer']);
  });
});
