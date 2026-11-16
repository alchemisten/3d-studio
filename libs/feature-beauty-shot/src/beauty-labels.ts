/** The texts of the beauty shot dialog and its menu entry. */
export interface BeautyLabels {
  title: string;
  quality: string;
  denoise: string;
  moreSettings: string;
  samples: string;
  back: string;
  cancel: string;
  render: string;
  save: string;
  compare: string;
  original: string;
  denoised: string;
  progress: string;
  /** Labels of the shipped presets, used while a preset still carries its default label. */
  'preset.quick': string;
  'preset.standard': string;
  'preset.high': string;
}

/** The label sets shipped with the feature by locale. */
export const beautyLabels: Record<string, BeautyLabels> = {
  en: {
    title: 'Beauty shot',
    quality: 'Quality',
    denoise: 'Denoise',
    moreSettings: 'More settings',
    samples: 'Samples',
    back: 'Back to scene',
    cancel: 'Cancel',
    render: 'Render image',
    save: 'Save image',
    compare: 'Compare render',
    original: 'Original',
    denoised: 'Denoised',
    progress: 'Render progress',
    'preset.quick': 'Quick',
    'preset.standard': 'Standard',
    'preset.high': 'High',
  },
  de: {
    title: 'Beauty Shot',
    quality: 'Qualität',
    denoise: 'Entrauschen',
    moreSettings: 'Weitere Einstellungen',
    samples: 'Samples',
    back: 'Zurück zur Szene',
    cancel: 'Abbrechen',
    render: 'Bild rendern',
    save: 'Bild speichern',
    compare: 'Rendering vergleichen',
    original: 'Original',
    denoised: 'Entrauscht',
    progress: 'Renderfortschritt',
    'preset.quick': 'Schnell',
    'preset.standard': 'Standard',
    'preset.high': 'Hoch',
  },
};

/** The labels of a locale with single texts overridden; unknown locales fall back to English. */
export const resolveBeautyLabels = (locale: string, overrides: Partial<Record<string, string>> = {}): BeautyLabels => ({
  ...(beautyLabels[locale] ?? beautyLabels.en),
  ...(Object.fromEntries(Object.entries(overrides).filter(([, text]) => text !== undefined)) as Partial<BeautyLabels>),
});

/** The label of a preset: its own, or the localized one while it still carries the shipped English label. */
export const presetLabel = (preset: { id: string; label: string }, labels: BeautyLabels): string => {
  const key = `preset.${preset.id}` as keyof BeautyLabels;
  return beautyLabels.en[key] === preset.label ? labels[key] : preset.label;
};
