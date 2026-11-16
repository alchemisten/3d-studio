import { describe, expect, it } from 'vitest';
import type { Highlight } from '@schablone/3d-studio-feature-highlights';
import { applyEditorChange, type EditorValue, highlightsOf, parseEditorValue } from './editor-value';
import { createTranslate, editorMessagesDe, editorMessagesEn, formatMessage } from './messages';

const highlight: Highlight = { id: 'a', anchor: { position: [0, 0, 0] } };

const value: EditorValue = {
  featureConfig: { highlights: { locale: 'de', highlights: [] }, floor: { mode: 'matte' } },
  materials: { door: 'steel' },
};

describe('applyEditorChange', () => {
  it('writes highlights into the highlights feature config and keeps its other keys', () => {
    const next = applyEditorChange(value, { type: 'highlights', highlights: [highlight] });
    expect(next.featureConfig.highlights).toEqual({ locale: 'de', highlights: [highlight] });
    expect(highlightsOf(next)).toEqual([highlight]);
    expect(next.featureConfig.floor).toBe(value.featureConfig.floor);
    expect(value.featureConfig.highlights).toEqual({ locale: 'de', highlights: [] });
  });

  it('replaces the overrides of one feature and drops the entry when none remain', () => {
    const changed = applyEditorChange(value, { type: 'feature-config', featureId: 'floor', config: { mode: 'off' } });
    expect(changed.featureConfig.floor).toEqual({ mode: 'off' });
    const cleared = applyEditorChange(value, { type: 'feature-config', featureId: 'floor', config: {} });
    expect('floor' in cleared.featureConfig).toBe(false);
    expect(cleared.materials).toBe(value.materials);
  });

  it('replaces the material assignments without touching the feature config', () => {
    const next = applyEditorChange(value, { type: 'materials', materials: { door: 'oak', frame: 'steel' } });
    expect(next.materials).toEqual({ door: 'oak', frame: 'steel' });
    expect(next.featureConfig).toBe(value.featureConfig);
  });

  it('sets and removes the opening camera', () => {
    const openingCamera = { position: [1, 2, 3], target: [0, 0, 0] } satisfies EditorValue['openingCamera'];
    const set = applyEditorChange(value, { type: 'opening-camera', openingCamera });
    expect(set.openingCamera).toEqual(openingCamera);
    const reset = applyEditorChange(set, { type: 'opening-camera', openingCamera: undefined });
    expect('openingCamera' in reset).toBe(false);
  });
});

describe('parseEditorValue', () => {
  it('fills missing parts of a stored value', () => {
    expect(parseEditorValue(undefined)).toEqual({ featureConfig: {}, materials: {} });
    expect(parseEditorValue({ materials: { a: 'b' } })).toEqual({ featureConfig: {}, materials: { a: 'b' } });
  });

  it('rejects malformed values', () => {
    expect(() => parseEditorValue({ materials: { a: 1 } })).toThrow();
    expect(() => parseEditorValue({ openingCamera: { position: [1, 2], target: [0, 0, 0] } })).toThrow();
  });
});

describe('messages', () => {
  it('fills placeholders and leaves unknown ones in place', () => {
    expect(formatMessage('Highlight {number}', { number: 3 })).toBe('Highlight 3');
    expect(formatMessage('{name} entfernen')).toBe('{name} entfernen');
  });

  it('falls back to English and then to the key, so literal labels pass through', () => {
    const t = createTranslate({ 'highlights.add': 'Neu' });
    expect(t('highlights.add')).toBe('Neu');
    expect(t('highlights.remove')).toBe(editorMessagesEn['highlights.remove']);
    expect(t('My custom section')).toBe('My custom section');
  });

  it('ships German for every English message', () => {
    expect(Object.keys(editorMessagesDe).sort()).toEqual(Object.keys(editorMessagesEn).sort());
  });
});
