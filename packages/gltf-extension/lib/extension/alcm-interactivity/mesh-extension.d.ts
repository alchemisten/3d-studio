import { MaterialOptionEntry } from "./materials-extension";
export interface MeshesExtension {
    /** @schemaInclude:glTFid */
    defaultMaterialOptionGroup: number;
    ignoreOptions?: boolean;
    materials: MaterialOptionEntry[];
}
