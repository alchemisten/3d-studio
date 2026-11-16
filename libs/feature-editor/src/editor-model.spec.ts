import { describe, expect, it } from 'vitest';
import { emptyHistory, pushHistory, redoHistory, undoHistory } from './editor-history';
import { editorNavFromSearch, editorNavToSearch, encodePartKeys, normalizeNav, partKeysOf } from './editor-nav';
import { applyEditorChange, type EditorValue } from './editor-value';
import { applyRuntimeOverrides, defaultRuntimeOverrides, isOverridden, runtimeOverrides } from './runtime-overrides';
import { clampSidebarWidth, nextIndex, orderTabs, SIDEBAR_WIDTH } from './shell/shell-model';

const value = (materials: Record<string, string>): EditorValue => ({ featureConfig: {}, materials });

describe('editor nav', () => {
  it('drops unset entries and the default mode', () => {
    expect(normalizeNav({ tool: 'highlights', mode: 'select', collapsed: false, part: '' })).toEqual({
      tool: 'highlights',
    });
  });

  it('round-trips through query params next to the host params', () => {
    const nav = { tool: 'highlights', highlight: 'h1', mode: 'move-anchor', collapsed: true } as const;
    const search = editorNavToSearch(nav, 'page=3');
    expect(search.toString()).toBe('page=3&tool=highlights&highlight=h1&mode=move-anchor&collapsed=1');
    expect(editorNavFromSearch(search)).toEqual(nav);
    expect(editorNavToSearch({ tool: 'materials' }, search).toString()).toBe('page=3&tool=materials');
  });

  it('supports a prefix and ignores malformed params', () => {
    expect(editorNavToSearch({ tool: 'a' }, '', 'e.').toString()).toBe('e.tool=a');
    expect(editorNavFromSearch('e.tool=a&tool=b', 'e.')).toEqual({ tool: 'a' });
    expect(editorNavFromSearch('?mode=fly&collapsed=yes&tool=')).toEqual({});
  });

  it('encodes several part keys, also keys with commas', () => {
    const encoded = encodePartKeys(['0/1', 'a,b', '50%', '0/1']);
    expect(encoded).toBe('0/1,a%2Cb,50%25');
    expect(partKeysOf({ part: encoded })).toEqual(['0/1', 'a,b', '50%']);
    expect(encodePartKeys([])).toBeUndefined();
    expect(partKeysOf({})).toEqual([]);
  });
});

describe('editor history', () => {
  it('undoes and redoes finished edits, and a new edit drops the redo stack', () => {
    const [a, b, c] = [value({ a: '1' }), value({ b: '1' }), value({ c: '1' })];
    const afterTwo = pushHistory(pushHistory(emptyHistory, a), b);
    const undone = undoHistory(afterTwo, c);
    expect(undone?.value).toBe(b);
    expect(undone?.history).toEqual({ past: [a], future: [c] });
    const redone = undone && redoHistory(undone.history, b);
    expect(redone?.value).toBe(c);
    expect(redone?.history).toEqual({ past: [a, b], future: [] });
    expect(undone && pushHistory(undone.history, b).future).toEqual([]);
    expect(undoHistory(emptyHistory, a)).toBeUndefined();
    expect(redoHistory(emptyHistory, a)).toBeUndefined();
  });

  it('keeps at most the limit of entries', () => {
    expect(pushHistory({ past: [value({}), value({})], future: [] }, value({}), 2).past).toHaveLength(2);
  });

  it('restores a whole value', () => {
    const earlier = value({ a: '1' });
    expect(applyEditorChange(value({ b: '2' }), { type: 'restore', value: earlier })).toBe(earlier);
  });
});

describe('runtime overrides', () => {
  it('switch disruptive behaviour off for the viewport without touching the stored config', () => {
    const stored = { 'camera-rotation': { enabled: true, speed: 4 }, floor: { mode: 'matte' } };
    const running = applyRuntimeOverrides(stored, defaultRuntimeOverrides);
    expect(running['camera-rotation']).toEqual({ enabled: false, speed: 4 });
    expect(running.animation).toEqual({ autoplay: 'none' });
    expect(running.highlights).toEqual({ pauseOnHover: false, detail: false, select: false });
    expect(running.floor).toBe(stored.floor);
    expect(stored['camera-rotation']).toEqual({ enabled: true, speed: 4 });
  });

  it('tells which keys the viewport ignores', () => {
    expect(isOverridden(defaultRuntimeOverrides, 'camera-rotation', 'enabled')).toBe(true);
    expect(isOverridden(defaultRuntimeOverrides, 'camera-rotation', 'speed')).toBe(false);
    expect(isOverridden([runtimeOverrides.autoplay], 'camera-rotation', 'enabled')).toBe(false);
    expect(applyRuntimeOverrides({ a: 1 }, [])).toEqual({ a: 1 });
  });
});

describe('shell model', () => {
  it('orders tabs by the host order first, then by their own order', () => {
    const tabs = [
      { id: 'settings', order: 30 },
      { id: 'model' },
      { id: 'highlights', order: 20 },
      { id: 'materials', order: 10 },
    ];
    expect(orderTabs(tabs).map((tab) => tab.id)).toEqual(['model', 'materials', 'highlights', 'settings']);
    expect(orderTabs(tabs, ['highlights', 'model']).map((tab) => tab.id)).toEqual([
      'highlights',
      'model',
      'materials',
      'settings',
    ]);
  });

  it('moves along a list with arrow, home and end keys and wraps', () => {
    expect(nextIndex('ArrowRight', 0, 3)).toBe(1);
    expect(nextIndex('ArrowDown', 2, 3)).toBe(0);
    expect(nextIndex('ArrowUp', 0, 3)).toBe(2);
    expect(nextIndex('Home', 2, 3)).toBe(0);
    expect(nextIndex('End', 0, 3)).toBe(2);
    expect(nextIndex('Enter', 0, 3)).toBeUndefined();
    expect(nextIndex('ArrowRight', 0, 0)).toBeUndefined();
  });

  it('keeps the sidebar width within its bounds', () => {
    expect(clampSidebarWidth(10)).toBe(SIDEBAR_WIDTH.min);
    expect(clampSidebarWidth(5000)).toBe(SIDEBAR_WIDTH.max);
    expect(clampSidebarWidth(400.4)).toBe(400);
  });
});
