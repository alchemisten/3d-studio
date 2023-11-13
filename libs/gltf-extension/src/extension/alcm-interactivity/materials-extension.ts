export interface MaterialsExtension {
  optionGroup: MaterialOptionGroup;
}

export interface MaterialOptionGroup {
  id: string;
  options: MaterialOption[];
}

export interface MaterialOption {
  id: string;
  name: string;
  overrides: { [key: string]: object };
}

export interface MaterialOptionEntry {
  /** @schemaInclude:glTFid */
  material: number;
  /** @schemaInclude:glTFid */
  materialOptionGroup?: number;

  ignoreOptions?: boolean;
}
