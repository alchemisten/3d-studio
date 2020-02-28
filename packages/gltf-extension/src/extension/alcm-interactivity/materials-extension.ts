export interface MaterialsExtension {
    optionGroup: MaterialOptionGroup;
}

export interface MaterialOptionGroup {
    id: String;
    options: MaterialOption[]
}

export interface MaterialOption {
    id: String;
    name: String;
    overrides: {[key: string]: object};
}

export interface MaterialOptionEntry {
    /** @schemaInclude:glTFid */
    material: number
    /** @schemaInclude:glTFid */
    materialOptionGroup?: number

    ignoreOptions?: boolean
}