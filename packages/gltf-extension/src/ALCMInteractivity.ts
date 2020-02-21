import {MaterialOptionGroup} from "./MaterialProperties";

export interface Interactivity {
    i18n: LanguageMap;
    materialOptionGroups: MaterialOptionGroup
}

export type LanguageMap = { [lang: string]: { [key: string]: string } };
