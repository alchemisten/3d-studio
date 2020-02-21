import {MaterialOptionGroup} from "./MaterialProperties";

export interface Interactivity {
    i18n: LanguageMap;
    materialOptionGroups: MaterialOptionGroup[]
    anchors: Anchor[]
    anchorCompatibility: AnchorMap
}

export type Key_I18N = string

export type LanguageMap = { [lang: string]: { [key: string]: string } };
/**
 * N:M Mapping for anchors gltfIds
 */
export type AnchorMap = { [anchorId: number]: number[] };

export interface Anchor {
    name: Key_I18N

    /**
     * Matrix to describe an anchor point, translation, direction, up vector.
     *
     * @schemaInclude:Accessor.type.MAT4
     * */
    matrix: number[]
}
