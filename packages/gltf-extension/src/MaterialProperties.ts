export interface Material {
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