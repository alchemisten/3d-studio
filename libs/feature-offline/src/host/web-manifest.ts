import { z } from 'zod';

const icon = z.object({
  src: z.string().min(1),
  /** E.g. `192x192`, or `any` for SVG. */
  sizes: z.string().min(1),
  type: z.string().min(1),
  purpose: z.enum(['any', 'maskable', 'monochrome']).optional(),
});

export const webManifestOptions = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  /** Relative to the manifest file. */
  startUrl: z.string().min(1).default('.'),
  /** Relative to the manifest file. */
  scope: z.string().min(1).default('.'),
  display: z.enum(['standalone', 'fullscreen', 'minimal-ui', 'browser']).default('standalone'),
  themeColor: z.string().min(1),
  backgroundColor: z.string().min(1),
  lang: z.string().min(1).optional(),
  icons: z.array(icon).min(1),
});

export type WebManifestOptions = z.input<typeof webManifestOptions>;

export interface WebManifest {
  name: string;
  short_name?: string;
  description?: string;
  start_url: string;
  scope: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  theme_color: string;
  background_color: string;
  lang?: string;
  icons: { src: string; sizes: string; type: string; purpose?: 'any' | 'maskable' | 'monochrome' }[];
}

/** Builds the content of a `manifest.webmanifest`; serialize it with `JSON.stringify`. */
export const createWebManifest = (options: WebManifestOptions): WebManifest => {
  const parsed = webManifestOptions.parse(options);
  return {
    name: parsed.name,
    short_name: parsed.shortName,
    description: parsed.description,
    start_url: parsed.startUrl,
    scope: parsed.scope,
    display: parsed.display,
    theme_color: parsed.themeColor,
    background_color: parsed.backgroundColor,
    lang: parsed.lang,
    icons: parsed.icons,
  };
};
