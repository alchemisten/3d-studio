export interface Mesh {
    /** @schemaInclude:glTFid */
    defaultMaterialOptionGroup: number;

    ignoreOptions?: boolean

    materials: MeshMaterialOption[]
}

export interface MeshMaterialOption {
    /** @schemaInclude:glTFid */
    material: number
    /** @schemaInclude:glTFid */
    materialOptionGroup?: number

    ignoreOptions?: boolean
}