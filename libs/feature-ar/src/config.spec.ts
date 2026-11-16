import { describe, expect, it } from 'vitest';
import { formatDimensions, resolveArAsset } from './ar-assets';
import { arLabels, resolveArLabels } from './ar-i18n';
import { arConfig } from './config';

const SCRIPT_URL = ['javascript', 'alert(1)'].join(':');

const enabled = {
  enabled: true,
  glb: 'projects/tray/model.glb',
  landingUrl: 'app/viewer/index.html?project=tray',
  slug: 'tray',
  stageUrl: 'https://x.test/',
};

describe('arConfig', () => {
  it('is off without any configuration', () => {
    expect(arConfig.parse({})).toEqual({ enabled: false });
  });

  it('fills the defaults of an enabled scene', () => {
    expect(arConfig.parse(enabled)).toEqual({
      ...enabled,
      isConfigured: false,
      isLanding: false,
      labels: {},
      locale: 'de',
      placement: 'output',
    });
  });

  it('names the field an enabled scene is missing', () => {
    const result = arConfig.safeParse({ ...enabled, glb: undefined });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(['glb']);
  });

  it('rejects urls that would not end up on the web', () => {
    expect(arConfig.safeParse({ ...enabled, stageUrl: 'file:///data/' }).success).toBe(false);
    expect(arConfig.safeParse({ ...enabled, usdz: SCRIPT_URL }).error?.issues[0].path).toEqual(['usdz']);
    expect(arConfig.safeParse({ ...enabled, bakeUrl: 'data:text/plain,x' }).error?.issues[0].path).toEqual(['bakeUrl']);
  });

  it('rejects an unknown locale, label key and non-positive dimensions', () => {
    expect(arConfig.safeParse({ ...enabled, locale: 'fr' }).success).toBe(false);
    expect(arConfig.safeParse({ ...enabled, placement: 'toolbar' }).success).toBe(false);
    expect(arConfig.safeParse({ ...enabled, labels: { unknown: 'x' } }).success).toBe(false);
    expect(arConfig.safeParse({ ...enabled, dimensionsMm: { height: 0, length: 600, width: 400 } }).success).toBe(
      false,
    );
  });
});

describe('resolveArAsset', () => {
  it('resolves relative files against the stage and keeps absolute ones', () => {
    expect(
      resolveArAsset({ glb: 'projects/tray/m.glb', stageUrl: 'https://x.test/', usdz: 'https://cdn.test/m.usdz' }),
    ).toEqual({
      glb: 'https://x.test/projects/tray/m.glb',
      usdz: 'https://cdn.test/m.usdz',
    });
  });

  it('leaves the USDZ out when the scene has none', () => {
    expect(resolveArAsset({ glb: 'm.glb', stageUrl: 'https://x.test/' })).toEqual({ glb: 'https://x.test/m.glb' });
  });
});

describe('formatDimensions', () => {
  it('formats length, width and height', () => {
    expect(formatDimensions({ height: 320, length: 600, width: 400 })).toBe('600 × 400 × 320 mm');
    expect(formatDimensions(undefined)).toBeNull();
  });
});

describe('resolveArLabels', () => {
  it('offers the same strings in both locales and lets the host override single ones', () => {
    expect(Object.keys(arLabels.en)).toEqual(Object.keys(arLabels.de));
    expect(resolveArLabels('en', { start: 'Place it' })).toMatchObject({ close: 'Close', start: 'Place it' });
  });
});
