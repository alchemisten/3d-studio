import {MaterialOptionEntry} from "./MaterialExtension";

export interface MeshesExtension {
    /** @schemaInclude:glTFid */
    defaultMaterialOptionGroup: number;

    ignoreOptions?: boolean

    materials: MaterialOptionEntry[]
}