import { AR_LANDING_PARAM } from './ar-landing';

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export class UnsupportedArUrlError extends Error {
  public constructor(public readonly url: string) {
    super(`Unsupported AR url, only http(s) can be handed to an AR viewer: ${url}`);
    this.name = 'UnsupportedArUrlError';
  }
}

const parse = (url: string, base: string): URL | null => {
  if (/^[a-z][a-z0-9+.-]*:/iu.test(url)) return URL.canParse(url) ? new URL(url) : null;
  return URL.canParse(url, base) ? new URL(url, base) : null;
};

/** Whether `url`, absolute or relative to `base`, ends up as an http(s) url. */
export const isWebReference = (url: string, base: string): boolean => {
  const absolute = parse(url, base);
  return absolute !== null && ALLOWED_PROTOCOLS.includes(absolute.protocol);
};

/**
 * Every AR url the viewer navigates to comes out of data, so this is the one
 * place an untrusted string could turn into navigation. Only http(s) survives.
 */
export const toAbsoluteUrl = (url: string, base: string): string => {
  const absolute = parse(url, base);
  if (!absolute || !ALLOWED_PROTOCOLS.includes(absolute.protocol)) {
    throw new UnsupportedArUrlError(url);
  }
  return absolute.toString();
};

/**
 * Quick Look opens only from an anchor carrying `rel="ar"` whose first child is
 * an `img`; any other structure opens a plain file preview instead. Must be
 * called synchronously from the tap handler: an await between the gesture and
 * the click breaks the user-activation chain.
 */
export const openQuickLook = (usdzUrl: string): void => {
  const anchor = document.createElement('a');
  anchor.rel = 'ar';
  anchor.href = toAbsoluteUrl(usdzUrl, window.location.href);
  anchor.style.display = 'none';

  const image = document.createElement('img');
  image.src = TRANSPARENT_PIXEL;
  anchor.append(image);

  document.body.append(anchor);
  anchor.click();
  anchor.remove();
};

export interface SceneViewerOptions {
  fallbackUrl: string;
  modelUrl: string;
  origin: string;
  title?: string;
}

export const buildSceneViewerIntent = ({ fallbackUrl, modelUrl, origin, title }: SceneViewerOptions): string => {
  const absoluteModel = toAbsoluteUrl(modelUrl, origin);
  const absoluteFallback = toAbsoluteUrl(fallbackUrl, origin);
  const parts = [
    `file=${encodeURIComponent(absoluteModel)}`,
    'mode=ar_only',
    `link=${encodeURIComponent(absoluteFallback)}`,
  ];
  if (title) parts.push(`title=${encodeURIComponent(title)}`);

  return `intent://arvr.google.com/scene-viewer/1.0?${parts.join(
    '&',
  )}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(
    absoluteFallback,
  )};end;`;
};

/**
 * The inverse of landing on `?ar=1`: strips only that parameter once the
 * dialog has been dismissed or has launched, so a refresh does not resurrect a
 * prompt the user already acted on. Every other query parameter and the hash
 * survive untouched.
 */
export const removeArLandingParam = (href: string): string => {
  const url = new URL(href);
  url.searchParams.delete(AR_LANDING_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
};
