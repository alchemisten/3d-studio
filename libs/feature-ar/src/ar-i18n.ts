export const AR_LOCALES = ['de', 'en'] as const;

export type ArLocale = (typeof AR_LOCALES)[number];

export const AR_LABEL_KEYS = [
  'close',
  'copied',
  'copyFailed',
  'copyHintAndroid',
  'copyHintIos',
  'copyLink',
  'errorBakeFailed',
  'errorUsdzMissing',
  'hint',
  'modalTitle',
  'preparing',
  'preparingHint',
  'qrHint',
  'qrTitle',
  'retry',
  'start',
  'view',
] as const;

export type ArLabelKey = (typeof AR_LABEL_KEYS)[number];

export type ArLabels = Record<ArLabelKey, string>;

export const arLabels: Record<ArLocale, ArLabels> = {
  de: {
    close: 'Schließen',
    copied: 'Link kopiert',
    copyFailed: 'Kopieren nicht möglich – Link bitte markieren',
    copyHintAndroid: 'AR startet in Chrome: Link kopieren, Chrome öffnen und den Link in die Adresszeile einfügen.',
    copyHintIos: 'AR startet in Safari: Link kopieren, Safari öffnen und den Link in die Adresszeile einfügen.',
    copyLink: 'Link kopieren',
    errorBakeFailed: 'Das Modell konnte nicht für AR vorbereitet werden. Bitte erneut versuchen.',
    errorUsdzMissing: 'Für dieses Modell gibt es keine AR-Datei für iPhone und iPad.',
    hint: 'Richte die Kamera auf eine freie Bodenfläche.',
    modalTitle: 'Im Raum ansehen',
    preparing: 'Wird vorbereitet …',
    preparingHint: 'Das Modell wird für AR vorbereitet – das dauert einen Moment.',
    qrHint: 'Code mit der Kamera scannen, um das Modell im Raum zu platzieren.',
    qrTitle: 'In AR ansehen',
    retry: 'Erneut versuchen',
    start: 'AR starten',
    view: 'In AR ansehen',
  },
  en: {
    close: 'Close',
    copied: 'Link copied',
    copyFailed: 'Copying failed – please select the link',
    copyHintAndroid: 'AR opens in Chrome: copy the link, open Chrome and paste it into the address bar.',
    copyHintIos: 'AR opens in Safari: copy the link, open Safari and paste it into the address bar.',
    copyLink: 'Copy link',
    errorBakeFailed: 'The model could not be prepared for AR. Please try again.',
    errorUsdzMissing: 'This model has no AR file for iPhone and iPad.',
    hint: 'Point your camera at a clear patch of floor.',
    modalTitle: 'View this model in your room',
    preparing: 'Preparing …',
    preparingHint: 'The model is being prepared for AR – this takes a moment.',
    qrHint: 'Scan the code with your camera to place the model in your room.',
    qrTitle: 'View in AR',
    retry: 'Try again',
    start: 'Start AR',
    view: 'View in AR',
  },
};

/** The built-in strings of a locale with the host's overrides on top. */
export const resolveArLabels = (locale: ArLocale, overrides: Partial<ArLabels> = {}): ArLabels => ({
  ...arLabels[locale],
  ...overrides,
});
