import { isRecord } from './record';

/**
 * Config the editor's viewport runs with instead of the stored one, so behaviour that gets in the way of
 * editing stays off while the stored and emitted `featureConfig` keeps its real values.
 */
export interface RuntimeOverride {
  id: string;
  featureId: string;
  config: Record<string, unknown>;
}

/** The shipped overrides by behaviour. */
export const runtimeOverrides = {
  /** No automatic camera rotation. */
  autoRotate: { id: 'auto-rotate', featureId: 'camera-rotation', config: { enabled: false } },
  /** Model animations do not start on their own. */
  autoplay: { id: 'autoplay', featureId: 'animation', config: { autoplay: 'none' } },
  /** Hovering a hotspot neither pauses animations nor previews it. */
  highlightHover: { id: 'highlight-hover', featureId: 'highlights', config: { pauseOnHover: false } },
  /** No viewer detail callout and highlight selector, which would move the camera. */
  highlightFocus: { id: 'highlight-focus', featureId: 'highlights', config: { detail: false, select: false } },
} satisfies Record<string, RuntimeOverride>;

/** What the editor suppresses unless the host passes its own list. */
export const defaultRuntimeOverrides: RuntimeOverride[] = Object.values(runtimeOverrides);

/** The feature config the viewport runs with: the stored one with the overrides on top. */
export const applyRuntimeOverrides = (
  featureConfig: Record<string, unknown>,
  overrides: readonly RuntimeOverride[],
): Record<string, unknown> =>
  overrides.reduce<Record<string, unknown>>((result, { featureId, config }) => {
    const current = result[featureId];
    return { ...result, [featureId]: { ...(isRecord(current) ? current : {}), ...config } };
  }, featureConfig);

/** The shipped features whose config takes a `locale`. */
export const LOCALIZED_FEATURE_IDS: readonly string[] = [
  'highlights',
  'light-scenarios',
  'beauty-shot',
  'ambient-occlusion',
];

/** The feature config with the editor's locale as the default locale of features that take one. */
export const applyLocale = (
  featureConfig: Record<string, unknown>,
  locale: string,
  featureIds: readonly string[] = LOCALIZED_FEATURE_IDS,
): Record<string, unknown> =>
  featureIds.reduce<Record<string, unknown>>((result, featureId) => {
    const current = result[featureId];
    return { ...result, [featureId]: { locale, ...(isRecord(current) ? current : {}) } };
  }, featureConfig);

/** Whether the viewport ignores the stored value of a config key. */
export const isOverridden = (overrides: readonly RuntimeOverride[], featureId: string, key: string): boolean =>
  overrides.some((override) => override.featureId === featureId && key in override.config);
