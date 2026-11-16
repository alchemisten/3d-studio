import { z } from 'zod';
import { AR_LABEL_KEYS, AR_LOCALES } from './ar-i18n';
import { isWebReference } from './ar-links';

const REFERENCE_KEYS = ['glb', 'usdz', 'bakeUrl', 'landingUrl'] as const;

const reference = z.string().min(1);

const millimetres = z.number().positive();

const enabledConfig = z
  .object({
    enabled: z.literal(true),
    /** Identifies the scene towards the bake service. */
    slug: z.string().min(1),
    /** Base every other url may be relative to. */
    stageUrl: z.url({ protocol: /^https?$/ }),
    locale: z.enum(AR_LOCALES).default('de'),
    /** Model handed to Scene Viewer on Android. */
    glb: reference,
    /** Model handed to Quick Look on iOS. */
    usdz: reference.optional(),
    /** GET endpoint that prepares a USDZ on demand when `usdz` is absent. */
    bakeUrl: reference.optional(),
    /**
     * The model on screen is configured by the page's query string, so `glb` and `usdz` do not show it: the bake
     * service prepares the model for Android as well, and a result is only used for the query it was made for.
     */
    isConfigured: z.boolean().default(false),
    /** Public page a phone opens from the QR code or the copied link. */
    landingUrl: reference,
    /** The page was opened for AR: show the way in straight away. */
    isLanding: z.boolean().default(false),
    /** Where the entry point sits: an action in the Output menu, or a button of its own top right. */
    placement: z.enum(['output', 'button']).default('output'),
    dimensionsMm: z.object({ height: millimetres, length: millimetres, width: millimetres }).optional(),
    /** Overrides of single built-in strings of the chosen locale. */
    labels: z.partialRecord(z.enum(AR_LABEL_KEYS), z.string()).default({}),
  })
  .superRefine((config, context) => {
    for (const key of REFERENCE_KEYS) {
      const value = config[key];
      if (value !== undefined && !isWebReference(value, config.stageUrl)) {
        context.addIssue({ code: 'custom', message: 'Must be an http(s) url or relative to stageUrl', path: [key] });
      }
    }
  });

const disabledConfig = z.object({ enabled: z.literal(false).default(false) });

/** A scene without AR needs no further fields; an enabled one is validated in full. */
export const arConfig = z.discriminatedUnion('enabled', [enabledConfig, disabledConfig]);

export type ArConfig = z.output<typeof arConfig>;

export type EnabledArConfig = z.output<typeof enabledConfig>;
