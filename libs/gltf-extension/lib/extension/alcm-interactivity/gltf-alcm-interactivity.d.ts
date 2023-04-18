import { MaterialOptionGroup } from "./materials-extension";
export interface Interactivity {
    i18n: LanguageMap;
    materialOptionGroups: MaterialOptionGroup[];
    anchors: Anchor[];
    anchorCompatibility: AnchorMap;
}
export declare type Key_I18N = string;
export declare type LanguageMap = {
    [lang: string]: {
        [key: string]: string;
    };
};
/**
 * N:M Mapping for anchors gltfIds
 */
export declare type AnchorMap = {
    [anchorId: number]: number[];
};
export interface Anchor {
    name: Key_I18N;
    /**
     * Matrix to describe an anchor point, translation, direction, up vector.
     *
     * @schemaInclude:Accessor.type.MAT4
     * */
    matrix: number[];
}
