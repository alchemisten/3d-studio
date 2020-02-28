import {MaterialOptionEntry} from "./MaterialExtension";

export interface NodeExtension {

    /** @schemaInclude:glTFid */
    anchor: number;

    /** @schemaInclude:glTFid */
    defaultMaterialOptionGroup?: number;

    materials: MaterialOptionEntry[];
}