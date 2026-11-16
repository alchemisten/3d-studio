/** The texts of the ambient occlusion entry in the view options. */
export interface AmbientOcclusionLabels {
  title: string;
  auto: string;
  on: string;
  off: string;
}

/** The label sets shipped with the feature by locale. */
export const ambientOcclusionLabels: Record<string, AmbientOcclusionLabels> = {
  en: { title: 'Ambient occlusion', auto: 'Auto', on: 'On', off: 'Off' },
  de: { title: 'Umgebungsverdeckung', auto: 'Automatisch', on: 'Ein', off: 'Aus' },
};

/** The labels of a locale with single texts overridden; unknown locales fall back to English. */
export const resolveAmbientOcclusionLabels = (
  locale: string,
  overrides: Partial<Record<string, string>> = {},
): AmbientOcclusionLabels => ({
  ...(ambientOcclusionLabels[locale] ?? ambientOcclusionLabels.en),
  ...(Object.fromEntries(
    Object.entries(overrides).filter(([, text]) => text !== undefined),
  ) as Partial<AmbientOcclusionLabels>),
});
