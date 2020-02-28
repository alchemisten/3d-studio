import {MaterialOptionEntry} from "./materials-extension";

export interface NodesExtension {

    /** @schemaInclude:glTFid */
    anchor: number;

    /** @schemaInclude:glTFid */
    defaultMaterialOptionGroup?: number;

    materials: MaterialOptionEntry[];
}