import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildSceneViewerIntent,
  isWebReference,
  openQuickLook,
  removeArLandingParam,
  toAbsoluteUrl,
  UnsupportedArUrlError,
} from './ar-links';

const SCRIPT_URL = ['javascript', 'alert(1)'].join(':');

describe('toAbsoluteUrl', () => {
  it('resolves a relative url against the base', () => {
    expect(toAbsoluteUrl('/app/ar/m.usdz', 'https://x.test')).toBe('https://x.test/app/ar/m.usdz');
  });

  it('keeps an absolute https url', () => {
    expect(toAbsoluteUrl('https://cdn.test/m.usdz', 'https://x.test')).toBe('https://cdn.test/m.usdz');
  });

  it('keeps an absolute https url even when the page has no usable origin', () => {
    expect(toAbsoluteUrl('https://cdn.test/m.usdz', 'null')).toBe('https://cdn.test/m.usdz');
  });

  it('rejects javascript: urls', () => {
    expect(() => toAbsoluteUrl(SCRIPT_URL, 'https://x.test')).toThrow(UnsupportedArUrlError);
  });

  it('rejects data: urls', () => {
    expect(() => toAbsoluteUrl('data:text/html,<script>', 'https://x.test')).toThrow(UnsupportedArUrlError);
  });

  it('rejects a relative url on a file page', () => {
    expect(() => toAbsoluteUrl('m.glb', 'file:///data/viewer/index.html')).toThrow(UnsupportedArUrlError);
  });
});

describe('isWebReference', () => {
  it('accepts http(s) urls, absolute or relative to an http(s) base', () => {
    expect(isWebReference('https://cdn.test/m.glb', 'https://x.test/')).toBe(true);
    expect(isWebReference('projects/tray/m.glb', 'https://x.test/')).toBe(true);
  });

  it('rejects everything else without throwing', () => {
    expect(isWebReference(SCRIPT_URL, 'https://x.test/')).toBe(false);
    expect(isWebReference('m.glb', 'file:///data/')).toBe(false);
    expect(isWebReference('m.glb', 'not a url')).toBe(false);
  });
});

describe('openQuickLook', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('clicks an anchor whose first child is an img', () => {
    const clicked: HTMLAnchorElement[] = [];
    const spy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });

    openQuickLook('https://x.test/app/ar/m.usdz');

    expect(clicked).toHaveLength(1);
    expect(clicked[0].rel).toBe('ar');
    expect(clicked[0].href).toBe('https://x.test/app/ar/m.usdz');
    expect(clicked[0].firstElementChild?.tagName).toBe('IMG');
    spy.mockRestore();
  });

  it('removes the anchor again so the DOM is not littered', () => {
    const spy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    openQuickLook('/app/ar/m.usdz');

    expect(document.querySelectorAll('a[rel="ar"]').length).toBe(0);
    spy.mockRestore();
  });

  it('refuses a non-http url rather than clicking it', () => {
    expect(() => openQuickLook(SCRIPT_URL)).toThrow(UnsupportedArUrlError);
  });
});

describe('buildSceneViewerIntent', () => {
  it('encodes the model and fallback urls', () => {
    const intent = buildSceneViewerIntent({
      fallbackUrl: '/app/view/tray',
      modelUrl: '/app/ar/m.glb',
      origin: 'https://x.test',
      title: 'Tray',
    });

    expect(intent.startsWith('intent://arvr.google.com/scene-viewer/1.0?')).toBe(true);
    expect(intent).toContain(`file=${encodeURIComponent('https://x.test/app/ar/m.glb')}`);
    expect(intent).toContain('mode=ar_only');
    expect(intent).toContain(`S.browser_fallback_url=${encodeURIComponent('https://x.test/app/view/tray')}`);
    expect(intent.endsWith(';end;')).toBe(true);
  });

  it('fails with a typed error for a fallback page Scene Viewer cannot return to', () => {
    expect(() =>
      buildSceneViewerIntent({
        fallbackUrl: 'file:///data/viewer/index.html',
        modelUrl: 'https://x.test/m.glb',
        origin: 'https://x.test',
      }),
    ).toThrow(UnsupportedArUrlError);
  });
});

describe('removeArLandingParam', () => {
  it('strips only the ar parameter, keeping other params and the hash', () => {
    expect(removeArLandingParam('https://x.test/app/view/tray?ar=1&lang=de#section')).toBe(
      '/app/view/tray?lang=de#section',
    );
  });

  it('leaves a url with no ar parameter unchanged in shape', () => {
    expect(removeArLandingParam('https://x.test/app/view/tray?lang=de')).toBe('/app/view/tray?lang=de');
  });
});
