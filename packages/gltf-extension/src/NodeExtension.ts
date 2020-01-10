import {SwapMaterial} from "./ALCMInteractivity";

export interface NodeExtension {
    /**
     * @schemaInclude:glTFid
     */
    defaultMaterialOptionGroup?: number;
    materials: SwapMaterial[]; //Could also be Map<number, SwapMaterial>?
}