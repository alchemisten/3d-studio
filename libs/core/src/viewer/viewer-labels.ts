/** The texts of the viewer's own chrome. */
export interface ViewerLabels {
  /** Name of the menu with the model tools. */
  customize: string;
  /** Name of the menu with the output actions. */
  output: string;
  /** Name of the menu with the view options. */
  viewOptions: string;
  retry: string;
  loadError: string;
}

/** The label sets shipped with the viewer by locale. */
export const viewerLabels: Record<string, ViewerLabels> = {
  en: {
    customize: 'Customize',
    output: 'Output',
    viewOptions: 'View options',
    retry: 'Retry',
    loadError: 'Something went wrong while loading the model.',
  },
  de: {
    customize: 'Anpassen',
    output: 'Ausgabe',
    viewOptions: 'Ansichtsoptionen',
    retry: 'Erneut versuchen',
    loadError: 'Beim Laden des Modells ist ein Fehler aufgetreten.',
  },
};

/** The labels of a locale with single texts overridden; unknown locales fall back to English. */
export const resolveViewerLabels = (locale = 'en', overrides?: Partial<ViewerLabels>): ViewerLabels => ({
  ...(viewerLabels[locale] ?? viewerLabels.en),
  ...overrides,
});
