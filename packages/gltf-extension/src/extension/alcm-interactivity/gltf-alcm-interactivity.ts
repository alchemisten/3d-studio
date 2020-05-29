import { MaterialOptionGroup } from "./materials-extension";

/**
 * Root extensions for the ALCM_interactivity vendor extension.
 * 
 * @member i18n - Contains a list of supported languages and a dictionary to look up specific static text values for a given text and language key.
 * @member materialOptionGroups - Contains an array of MaterialOptionGroups in a gltf flat manner to be reusable by any node/mesh without duplications.
 * @member anchorExtension - Contains an array of the individual anchors for all scenes and their objects and the possible combinations among them.
 * @member viewerFeatures - Contains all possible viewer functions that can be activated/deactivated for the project separately and have a default start value.
 * @member projectInformation - Describes additonal project information @see ProjectInformation.
 */
export interface Interactivity {
    i18n: Internationalization
    materialOptionGroups: MaterialOptionGroup[]
    anchorExtension: AnchorExtension
    viewerFeatures: ViewerFeatures
    projectInformation: ProjectInformation
    highlights: Highlight[]
    background?: {
        color?: ColorString
        texture?: string
        cubeTexture?: string
    }
    environment?: {
        texture?: string
    }
}

/**
 * Describing additional project information.
 * 
 * @member id - Should uniquely identify this artifact in composition with the @member projectId.
 * @member projectId - Should be given to a project, indirectly reduces the possibility of name collisions.
 * @member name - A simple name for this project/artifcat can differ from the projectId.
 * @member version - Expresses the current version of the artifact, should be incremented when changes have been applied to trigger update mechanisms for custom viewer implementations like cache invalidation.
 * @member changeDate - Should be set accordingly to @member version, describes the last change date of the file or any dependent external asset.
 * @member baseUrl - Describes the base url to download content externally and/or dynamically in conjunction with the @member folder.
 * @member folder - Specifies the subpath/folder for @see baseUrl.
 * @member orientation - Specifies the optimal view orientation for the scene/s.
 * @member heading - Specifies a template which can be used by a viewer implementation to display dynamic/static and internationalized headings.
 * @member intro - Specifies a template for a custom intro which could be displayed at the beginning of a scene. E.g. to acquaint a first time user to the controls of a viewer implementation.
 * @member tags - Additional information to allow for filtering, UI overlays, etc.
 */
export interface ProjectInformation {
    id: string
    projectId: string
    name: string
    version: number
    changeDate: Date
    baseUrl: string
    folder: string
    orientation: ViewOrientation
    heading: TemplateString
    intro: TemplateString
    tags: [string]
}

export interface Internationalization {
    supportedLocales: String
    languageMap: LanguageMap
}

export enum Positioning {
    Top = 0.0,
    Left = 0.0,
    Center = 0.5,
    Bottom = 1.0,
    Right = 1.0
}

export enum ViewOrientation {
    Portrait = "PORTRAIT",
    Landscape = "LANDSCAPE",
    All = "ALL"
}

export enum LocationTransformType {
    Local = "LOCAL",
    Global = "GLOBAL",
    Fixed = "FIXED"
}

export type ColorString = string
export type TemplateString = string
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
    transformationType: LocationTransformType
}

export interface AnchorExtension {
    anchors: Anchor[]
    anchorCompatibilities: AnchorMap
}

export interface ViewerFeatures {
    useSkyBox: ViewerFeature<boolean>
    useAutoRotate: ViewerFeature<boolean>
    showHighlight: ViewerFeature<boolean>
    useFullscreen: ViewerFeature<boolean>
    useSettings: ViewerFeature<boolean>
    useAnimations: ViewerFeature<boolean>
    useFloatingLight: ViewerFeature<boolean>
    useWireframe: ViewerFeature<boolean>
    useVideo: ViewerFeature<boolean>
    usePostProcessing: ViewerFeature<boolean>
    useTransparency: ViewerFeature<boolean>
    useFog: ViewerFeature<FogOptions>
    useBackground: ViewerFeature<boolean> //TODO  Could specify a more convenient type to allow selection of a background
    useEnvironment: ViewerFeature<boolean> //TODO  Could specify a more convenient type to allow selection of an environment
}
export interface ViewerFeature<T> {
    active: boolean,
    default: T
}

export interface FogOptions {
    color: ColorString
    near: number
    far: number
}
export type StrokeOptions = {
    color: ColorString
    thickness: number
    transparency?: number
}

export type NodeStyleMap = {
    [nodeId: number]: {
        strokeOptions: StrokeOptions
        duration?: number
    }
}

export interface Highlight {
    name: string
    attachedToNode: boolean
    target: number[]
    pos: number[]
    cam: number | number[] //gltfId or cam x,y,z
    transformationType: LocationTransformType
    connector: {
        path: number[][]
        interpolation: string //linear e.g.?
        strokeOptions : StrokeOptions
    }
    style: {
        scale: number
        fov: number
        anchor: string
    }
    isAnimationTrigger: boolean //TODO necessary?
    triggerAnimation: {
        fromBeginning?: boolean
        animationId: number //should be under animations/
        delay?: number
        endTime?: string //TODO define format
        relativeDuration?: string //TODO define format
        visibleThroughAnimation: boolean
    }
    isCameraPanTrigger: boolean //necessary?
    camerPanOptions: {
        duration: number //in ms
        easing: string //animejs easing name/function like cubicBezier(.5, .05, .1, .3)
        delay?: number //in ms
        visibleThroughPan: boolean
    }
    highlightNodesOnHover: NodeStyleMap
    highlightNodesOnClick: NodeStyleMap
    content?: {
        headline: TemplateString
        body: TemplateString
        position: {
            x: number | Positioning
            y: number | Positioning
        }
        offset: {
            x: number | Positioning
            y: number | Positioning
        }
        style?: string
    }
}

