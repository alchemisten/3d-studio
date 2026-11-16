import { z } from 'zod';

export const AMBIENT_OCCLUSION_ID = 'ambient-occlusion';

export const ambientOcclusionModes = ['auto', 'on', 'off'] as const;
export type AmbientOcclusionMode = (typeof ambientOcclusionModes)[number];

export const ambientOcclusionConfig = z.object({
  /** `false` removes the effect and its menu entry. */
  enabled: z.boolean().default(true),
  /** `auto` follows the quality tier of the viewer, `on` always renders the full effect. */
  mode: z.enum(ambientOcclusionModes).default('auto'),
  /** Strength of the darkening; 1 is the physically plausible amount. */
  intensity: z.number().min(0).max(2).default(1),
  /** Reach of the occlusion as a share of the model's size. */
  radius: z.number().min(0.005).max(0.5).default(0.06),
  /**
   * On devices below the `high` quality tier, leaves the effect out while the camera moves or the user interacts
   * and fades it in once the view rests. A device that holds the `high` tier shows it during movement too; if that
   * costs too many frames the tier drops and the effect waits for the view to rest again.
   */
  whenResting: z.boolean().default(true),
  /** Locale of the menu entry; `en` and `de` are shipped. */
  locale: z.string().default('en'),
  /** Overrides single texts of the menu entry (see `AmbientOcclusionLabels`). */
  labels: z.record(z.string(), z.string()).default({}),
});
export type AmbientOcclusionConfig = z.output<typeof ambientOcclusionConfig>;

export const isAmbientOcclusionMode = (value: unknown): value is AmbientOcclusionMode =>
  ambientOcclusionModes.includes(value as AmbientOcclusionMode);
