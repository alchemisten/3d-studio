import { MaterialOptionGroup } from './materials-extension';

/**
 * Root extensions for the ALCM_interactivity vendor extension.
 *
 * @member i18n - Contains a list of supported languages and a dictionary to look up specific static text values for a given text and language key.
 * @member materialOptionGroups - Contains an array of MaterialOptionGroups in a gltf flat manner to be reusable by any node/mesh without duplications.
 * @member anchorExtension - Contains an array of the individual anchors for all scenes and their objects and the possible combinations among them.
 * @member viewerFeatures - Contains all possible viewer functions that can be activated/deactivated for the project separately and have a default start value.
 * @member projectInformation - Describes additonal project information @see ProjectInformation.
 * @member highlights - Contains all highlights for each scene. The highlights do not have to be bound to a specific node in the hierarchy, they can also stand alone.
 */
export interface Interactivity {
  i18n: Internationalization;
  materialOptionGroups: MaterialOptionGroup[];
  anchorExtension: AnchorExtension;
  viewerFeatures: ViewerFeatures;
  projectInformation: ProjectInformation;
  highlights: Highlight[];
  background?: {
    // TODO make array
    type: 'color' | 'texture' | 'cubeTexture';
    value: ColorString | string; // TODO add documentation and definition for "URLLike"
  };
  environment?: {
    // TODO make array
    texture: string;
  };
}

/**
 * Describing additional project information.
 *
 * @member id - Should uniquely identify this artifact in composition with the @member projectId.
 * @member projectKey - Should be given to a project, indirectly reduces the possibility of name collisions.
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
  id: string;
  projectKey: string;
  name: string;
  version?: number;
  changeDate?: Date;
  baseUrl: string;
  orientation?: ViewOrientation;
  heading?: TemplateString;
  intro?: TemplateString;
  tags: [string];
}

/**
 * Preservation of all information for internationalization.
 *
 * @member supportedLocales - An array with each supported or enabled locale.
 * @member languageMap - The i18n dictionary containing the translations for specific locales and keys (@see LanguageMap.)
 */
export interface Internationalization {
  supportedLocales: string[];
  languageMap: LanguageMap;
}

// TODO (FlorianDe): Discuss
/**             x
 *   | 0 = (0.0, 0.0) | 1 = (0.0, 0.5) | 2 = (0.0, 1.0) |
 *   | 3 = (0.5, 0.0) | 4 = (0.5, 0.5) | 5 = (0.5, 1.0) |
 *   | 6 = (1.0, 0.0) | 7 = (1.0, 0.5) | 8 = (1.0, 1.0) |
 * y
 */
export enum Positioning {
  TopLeft = 'tl',
  Top = 't',
  TopRight = 'tr',
  Left = 'l',
  Center = 'c',
  Right = 'r',
  BottomLeft = 'bl',
  Bottom = 'b',
  BottomRight = 'br',
}

// TODO
export interface Vec2Like {
  x: number;
  y: number;
}

export const PositionRoots: {
  [k in Positioning]: Vec2Like;
} = {
  [Positioning.TopLeft]: { x: 0, y: 0 },
  [Positioning.Top]: { x: 0.5, y: 0 },
  [Positioning.TopRight]: { x: 1.0, y: 0 },
  [Positioning.Left]: { x: 0, y: 0.5 },
  [Positioning.Center]: { x: 0.5, y: 0.5 },
  [Positioning.Right]: { x: 1.0, y: 0.5 },
  [Positioning.BottomLeft]: { x: 0, y: 1.0 },
  [Positioning.Bottom]: { x: 0.5, y: 1.0 },
  [Positioning.BottomRight]: { x: 1.0, y: 1.0 },
};

/**
 * Possible values to tell the viewer implementation how the project should ideally be displayed.
 *
 * Portrait - The project should be displayed in portrait mode.
 * Landscape - The project should be displayed in landscape mode.
 * All - The project can either be displayed in portrait or landscape mode.
 */
export enum ViewOrientation {
  Portrait = 'PORTRAIT',
  Landscape = 'LANDSCAPE',
  All = 'ALL',
}

/**
 * Influences the behavior of how a certain property of an object should be transformed in correlation with the set transformation type.
 *
 * Local - Should be used if the property is to be transformed into correlation to the hierarchy.
 * Global - Should be used if the property shall have no hierarchical dependency.
 * Fixed - Can be used to restrict any transformation for a property. E.g. to place a highlight always at a specific position on the screen.
 */
export enum LocationTransformType {
  Local = 'LOCAL',
  Global = 'GLOBAL',
}

export type ColorString = string;
export type TemplateString = string;

/**
 * Type description for a dictionary.
 *
 * It is a nested map structure where the first key represents a locale value and the second key is a translation key to retrieve the translation.
 */
export type LanguageMap = { [lang: string]: { [key: string]: string } };

/**
 * Type description for a n:m number map.
 *
 * N:M mapping for compatible anchors with their corresponding gltfIds
 */
export type AnchorMap = { [anchorId: number]: number[] };

/**
 * Type description for an anchor object.
 *
 * @member id - A unique identifier to exactly specify
 * @member name - The name for an anchor which could be used to specify or display it. The name can be a templateable string to allow dynamic content and/or internationalization.
 * @member categories - An array of categories this anchor belongs to. This field can also be empty if an anchor has no suitable group/category
 * @member matrix - Matrix to describe an anchor point, translation, direction, up vector.
 * @member transformationType - The transformation type for the anchor position in relation to the scene/hierarchy (@see LocationTransformType).
 */
export interface Anchor {
  id: string;
  name?: TemplateString;
  categories?: string[];
  /**@schemaInclude:Accessor.type.MAT4 */
  matrix: number[];
  transformationType: LocationTransformType;
}

/**
 * Includes all components regarding the anchor extension.
 *
 * @member anchors - An array with anchors for all scenes.
 * @member anchorCompatibilities - The compatability n:m map for suitable anchors (@see AnchorMap.)
 */
export interface AnchorExtension {
  anchors: Anchor[];
  anchorCompatibilities: AnchorMap;
}

export interface ViewerFeatures {
  useSkyBox: ViewerFeature<boolean>;
  useAutoRotate: ViewerFeature<boolean>;
  showHighlight: ViewerFeature<boolean>;
  useFullscreen: ViewerFeature<boolean>;
  useSettings: ViewerFeature<boolean>;
  useAnimations: ViewerFeature<boolean>;
  useFloatingLight: ViewerFeature<boolean>;
  useWireframe: ViewerFeature<boolean>;
  useVideo: ViewerFeature<boolean>;
  usePostProcessing: ViewerFeature<boolean>;
  useTransparency: ViewerFeature<boolean>;
  useFog: ViewerFeature<FogOptions>;
  useBackground: ViewerFeature<boolean>; // TODO (FlorianDe): Could specify a more convenient type to allow selection of a background
  useEnvironment: ViewerFeature<boolean>; // TODO (FlorianDe): Could specify a more convenient type to allow selection of an environment
}

/**
 * This interface describes a generic feature for a viewer implementation which can be enabled/disabled for a project and which has as set default value.
 */
export interface ViewerFeature<T> {
  active: boolean;
  default: T;
}

export interface FogOptions {
  color: ColorString;
  near: number;
  far: number;
}

export type StrokeOptions = {
  color: ColorString;
  thickness: number;
  alpha?: number;
};

export type NodeStyleMap = {
  [nodeId: number]: {
    strokeOptions: StrokeOptions;
    duration?: number;
  };
};

export enum HighlightPositioning {
  World = 'WORLD',
  Screen = 'SCREEN',
}

// TODO define what each value does
export type AnimationTimeUnit = 'r' | 's' | 'ms' | 'f';

export interface AnimationLocation {
  time: number;
  unit: AnimationTimeUnit;
}

export type ContentStyleMap = {
  [containerSelector: string]: any;
};

export interface Highlight {
  name: string;
  attachedToNode: boolean;
  target: number | number[];
  position: number | number[];
  camera: number | number[]; //gltfId or cam x,y,z
  positioning: HighlightPositioning;
  visualLink: {
    path: number[][];
    interpolation: string; //linear e.g.?
    strokeOptions: StrokeOptions;
  };
  style: {
    billboard: boolean;
    fov: number;
  };
  triggerAnimation?: {
    animationId: number | number[]; //should be under animations/x
    teleport?: boolean;
    loopBehavior?: 'loop' | 'clamp';
    type: 'relative' | 'absolute' | 'play' | 'pause';
    speed?: number;
    target: AnimationLocation;
    start?: AnimationLocation;
    delay?: number;
    visibleThroughAnimation: boolean;
  };
  visibility?: {
    from: AnimationTimeUnit;
    to: AnimationTimeUnit;
    // TODO discuss -> Blending?
  };
  cameraTransitionOptions?: {
    duration: number; //in ms
    easing: string; //animejs easing name/function like cubicBezier(.5, .05, .1, .3)
    delay?: number; //in ms
    visibleThroughTransition: boolean;
  };
  highlightNodesOnHover: NodeStyleMap;
  highlightNodesOnClick: NodeStyleMap;
  content?: {
    headline: TemplateString;
    body: TemplateString;
    position: Positioning | Vec2Like;
    offset?: Vec2Like;
    style?: ContentStyleMap;
  };
}
