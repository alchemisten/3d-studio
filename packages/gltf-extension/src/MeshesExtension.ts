import {SwapMaterial} from "./ALCMInteractivity";

export interface MeshesExtension {
    /**
     * @schemaInclude:glTFid
     */
    defaultMaterialOptionGroup?: number;
    ignoreMaterialOptions: boolean;
    materials: SwapMaterial[];
}