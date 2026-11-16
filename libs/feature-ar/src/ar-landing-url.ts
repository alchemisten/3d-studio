import { AR_LANDING_PARAM } from './ar-landing';
import { toAbsoluteUrl } from './ar-links';

/** Parameters that address the embedding app, not the model. */
const APP_ONLY_PARAMS = ['a'];

export interface ArLandingUrlOptions {
  /** Public page a phone can open, absolute or relative to `stageUrl`. */
  landingUrl: string;
  stageUrl: string;
  /** Query string of the current page; it carries the state of the model. */
  search?: string;
}

/**
 * The url the QR code and the copied link point at. The query string of the
 * landing page and the one of the current page both survive: the first belongs
 * to the host's routing, the second describes what the user is looking at. On
 * a clash the landing page wins.
 */
export const buildArLandingUrl = ({ landingUrl, stageUrl, search = '' }: ArLandingUrlOptions): string => {
  const url = new URL(toAbsoluteUrl(landingUrl, stageUrl));
  const own = new Set(url.searchParams.keys());

  new URLSearchParams(search).forEach((value, key) => {
    if (!own.has(key) && !APP_ONLY_PARAMS.includes(key)) url.searchParams.append(key, value);
  });

  url.searchParams.set(AR_LANDING_PARAM, '1');
  return url.toString();
};
