import { describe, expect, it } from 'vitest';
import type { Highlight } from '@schablone/3d-studio-feature-highlights';
import {
  createHighlight,
  defaultPointerLength,
  hotspotPoint,
  liftOf,
  localizedValue,
  maxPointerLength,
  moveHighlight,
  neighbourId,
  nextHighlightId,
  partOf,
  placeHighlight,
  pointerDirection,
  pointerLengthOf,
  removeHighlight,
  reorderHighlight,
  type ResolveAnchor,
  setHighlightCamera,
  setHighlightText,
  setLocalizedValue,
  setPart,
  setPointerEnd,
  setPointerLength,
  surfacePoint,
  updateHighlight,
} from './highlight-draft';

const locales = ['de', 'en'];
const flat: Highlight = { id: 'a', label: { de: 'Griff' }, anchor: { position: [1, 0, 0] }, normal: [0, 0, 2] };
const list: Highlight[] = [
  flat,
  { id: 'b', anchor: { position: [0, 0, 0] } },
  { id: 'c', anchor: { position: [0, 1, 0] } },
];
const ids = (highlights: Highlight[]) => highlights.map((highlight) => highlight.id);

describe('placement and pointer', () => {
  it('creates a highlight on the surface with its normal and shot', () => {
    const created = createHighlight({
      id: 'n',
      title: 'Highlight 1',
      locale: 'de',
      point: [1, 2, 3],
      normal: [0, 1, 0],
      camera: { position: [5, 5, 5], target: [1, 2, 3] },
    });
    expect(created).toEqual({
      id: 'n',
      label: { de: 'Highlight 1' },
      anchor: { position: [1, 2, 3] },
      normal: [0, 1, 0],
      camera: { position: [5, 5, 5], target: [1, 2, 3] },
    });
    expect(surfacePoint(created)).toEqual([1, 2, 3]);
    expect(pointerLengthOf(created)).toBe(0);
  });

  it('lifts the hotspot along the stored normal and puts it back', () => {
    const lifted = setPointerLength(flat, 0.5);
    expect(lifted.target).toEqual({ position: [1, 0, 0] });
    expect(hotspotPoint(lifted)).toEqual([1, 0, 0.5]);
    expect(lifted.pointer).toBe(true);
    expect(pointerLengthOf(lifted)).toBeCloseTo(0.5);
    expect(setPointerLength(lifted, 0)).toEqual(flat);
  });

  it('rises along the current pointer, else straight up, without a stored normal', () => {
    const bare: Highlight = { id: 'x', anchor: { position: [0, 0, 0] } };
    expect(liftOf(setPointerLength(bare, 2))).toEqual([0, 2, 0]);
    const free = setPointerEnd(bare, [3, 0, 0]);
    expect(pointerDirection(free)).toEqual([1, 0, 0]);
    expect(hotspotPoint(setPointerLength(free, 1))).toEqual([1, 0, 0]);
  });

  it('moves along the surface, keeps the pointer length and follows the new normal', () => {
    const moved = placeHighlight(setPointerLength(flat, 0.5), [5, 5, 5], [1, 0, 0]);
    expect(moved.target).toEqual({ position: [5, 5, 5] });
    expect(hotspotPoint(moved)).toEqual([5.5, 5, 5]);
    expect(moved.normal).toEqual([1, 0, 0]);
    const onSurface = placeHighlight(flat, [2, 2, 2], [0, 1, 0]);
    expect(onSurface.anchor).toEqual({ position: [2, 2, 2] });
    expect(onSurface.normal).toEqual([0, 1, 0]);
  });

  it('places the label end freely and keeps the surface point', () => {
    const free = setPointerEnd(flat, [1, 2, 2]);
    expect(surfacePoint(free)).toEqual([1, 0, 0]);
    expect(hotspotPoint(free)).toEqual([1, 2, 2]);
    expect(pointerLengthOf(free)).toBeCloseTo(Math.hypot(2, 2));
  });

  it('turns node anchors into world positions on the first edit', () => {
    const resolve: ResolveAnchor = (anchor) => ('position' in anchor ? anchor.position : [10, 0, 0]);
    const followed: Highlight = { id: 'n', anchor: { position: [10, 2, 0] }, target: { node: 'door' }, pointer: true };
    expect(surfacePoint(followed, resolve)).toEqual([10, 0, 0]);
    expect(pointerLengthOf(followed, resolve)).toBe(2);
    const longer = setPointerLength(followed, 4, resolve);
    expect(longer.target).toEqual({ position: [10, 0, 0] });
    expect(longer.anchor).toEqual({ position: [10, 4, 0] });
  });

  it('scales pointer lengths with the model', () => {
    expect(defaultPointerLength(10)).toBeCloseTo(0.8);
    expect(maxPointerLength(10)).toBeCloseTo(4);
  });
});

describe('texts, shot and part', () => {
  it('reads a plain string as the text of the first locale', () => {
    expect(localizedValue('Tür', 'de', locales)).toBe('Tür');
    expect(localizedValue('Tür', 'en', locales)).toBe('');
    expect(localizedValue({ en: 'Door' }, 'en', locales)).toBe('Door');
  });

  it('sets one locale, keeps the others and drops empty texts', () => {
    expect(setLocalizedValue('Tür', 'en', 'Door', locales)).toEqual({ de: 'Tür', en: 'Door' });
    expect(setLocalizedValue({ de: 'Tür', en: 'Door' }, 'en', '', locales)).toEqual({ de: 'Tür' });
    expect(setLocalizedValue({ de: 'Tür' }, 'de', '', locales)).toBeUndefined();
    const described = setHighlightText(flat, 'description', 'en', 'A handle', locales);
    expect(described.description).toEqual({ en: 'A handle' });
    expect('description' in setHighlightText(described, 'description', 'en', '', locales)).toBe(false);
  });

  it('sets and clears the shot', () => {
    const framed = setHighlightCamera(flat, { position: [1, 1, 1], target: [0, 0, 0] });
    expect(framed.camera).toEqual({ position: [1, 1, 1], target: [0, 0, 0] });
    expect('camera' in setHighlightCamera(framed, undefined)).toBe(false);
  });

  it('attaches a part that glows and is outlined, and detaches it', () => {
    const attached = setPart(flat, 'door');
    expect(attached).toMatchObject({ nodes: ['door'], hoverOutline: true });
    expect(partOf(attached)).toBe('door');
    expect(setPart(attached, undefined)).toEqual(flat);
    expect(partOf(flat)).toBeUndefined();
  });
});

describe('list', () => {
  it('updates one highlight and leaves the list untouched', () => {
    const next = updateHighlight(list, 'b', (highlight) => ({ ...highlight, color: '#ff0000' }));
    expect(next[1].color).toBe('#ff0000');
    expect(next[0]).toBe(list[0]);
    expect(list[1].color).toBeUndefined();
  });

  it('removes a highlight together with the actions that lead to it', () => {
    const play = { id: 'play', label: 'Play', run: { play: true as const } };
    const linked = updateHighlight(list, 'a', (highlight) => ({
      ...highlight,
      actions: [play, { id: 'next', label: 'Next', run: { focus: 'b' } }],
    }));
    const next = removeHighlight(linked, 'b');
    expect(ids(next)).toEqual(['a', 'c']);
    expect(next[0].actions).toEqual([play]);
    expect(next[1]).toBe(list[2]);
  });

  it('reorders within the bounds of the list', () => {
    expect(ids(moveHighlight(list, 'a', 1))).toEqual(['b', 'a', 'c']);
    expect(ids(moveHighlight(list, 'a', -1))).toEqual(['a', 'b', 'c']);
    expect(ids(reorderHighlight(list, 'c', 0))).toEqual(['c', 'a', 'b']);
    expect(ids(reorderHighlight(list, 'a', 99))).toEqual(['b', 'c', 'a']);
    expect(ids(reorderHighlight(list, 'missing', 1))).toEqual(['a', 'b', 'c']);
  });

  it('steps to the neighbours and wraps', () => {
    expect(neighbourId(list, 'a', 1)).toBe('b');
    expect(neighbourId(list, 'a', -1)).toBe('c');
    expect(neighbourId(list, undefined, 1)).toBe('a');
    expect(neighbourId(list, undefined, -1)).toBe('c');
    expect(neighbourId([], 'a', 1)).toBeUndefined();
  });

  it('finds an unused id', () => {
    expect(nextHighlightId([])).toBe('highlight-1');
    expect(nextHighlightId(['highlight-2', 'x'])).toBe('highlight-3');
    expect(nextHighlightId(['highlight-2', 'highlight-3'])).toBe('highlight-4');
  });
});
