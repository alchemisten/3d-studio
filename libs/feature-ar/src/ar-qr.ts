import { renderSVG } from 'uqr';

/** The code as an image source, so it renders without injecting markup. */
export const qrCodeDataUrl = (text: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(renderSVG(text, { border: 2, ecc: 'M' }))}`;
