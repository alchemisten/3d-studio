export interface Interactivity {
    i18n: LanguageMap;
}

export type LanguageMap = { [lang: string]: { [key: string]: string } };
