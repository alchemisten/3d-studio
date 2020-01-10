export interface Interactivity {
    i18n: LanguageMap;
    materialOptionGroups: MaterialOptionGroup[];
}

export interface MaterialOptionGroup {
    id: string;
    options: MaterialOptions[];
}

export interface MaterialOptions {
    id: string;
    name: string;
    overrides: Map<string, any>;
}

export interface SwapMaterial {
    /**
     * @schemaInclude:glTFid
     */
    material: number;
    /**
     * @schemaInclude:glTFid
     */
    optionGroup?: number;

    ignoreOptions?: boolean;
}

export type LanguageMap = { [lang: string]: { [key: string]: string } };
