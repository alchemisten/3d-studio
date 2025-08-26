import type {
  AnimationAction,
  AnimationMixer,
  ColorSpace,
  CubeTexture,
  Light,
  Material,
  Object3D,
  PerspectiveCamera,
  Scene,
  ShadowMapType,
  Texture,
  Vector3,
  WebGLCubeRenderTarget,
  WebGLRenderer,
} from 'three';
import type { Observable } from 'rxjs';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ILogger, LoggerOptions } from '@schablone/logging';
import type { FeatureSetup, IFeatureRegistryService, IFeatureService } from './feature';
import { LightType } from './enums';
import type { interfaces } from 'inversify';

export interface ViewerConfigModel {
  /**
   * The configuration for the camera. If not provided, the default camera
   * configuration is used. See the config service source for the default
   * configuration.
   */
  camera?: Partial<CameraConfigModel>;
  /**
   * The configuration for the controls. If not provided, the default controls
   * configuration is used.
   */
  controls?: Partial<ControlConfigModel>;
  /**
   * The configuration for the features determines which features are loaded
   * and how they should be configured. By default, no features are loaded.
   */
  features?: FeatureSetup;
  /**
   * The configuration for the objects to load. At least one object has to be
   * provided.
   */
  objects: ObjectSetupModel[];
  /**
   * The configuration for the project.
   */
  project?: ProjectConfigModel;
  /**
   * The configuration for the renderer. If not provided, the default renderer
   * configuration is used. See the config service source for the default
   * configuration.
   */
  render?: Partial<RenderConfigModel>;
}

export interface ControlConfigModel {
  /**
   * Whether the user can zoom in and out of the scene with the mouse wheel.
   * Enabled by default.
   */
  allowZoom?: boolean;
}

export interface ObjectSetupModel {
  /**
   * Whether this object should cast shadows when hit by a shadow casting light
   */
  castShadow?: boolean;
  /**
   * The name of the object. If provided, this will overwrite the name in the
   * GLTF file before adding the object to the scene.
   */
  name?: string;
  /**
   * The path to the object. Currently only GTLF files are supported.
   * Note that relative paths are relative to the project basedir as
   * specified in the project config of the viewer config.
   */
  path: string;
  /**
   * Optional scaling of the object if it is too big or too small in the scene
   */
  scale?: number;
  /**
   * Whether this object should be shadowed by other shadow casting objects (including itself)
   */
  receiveShadow?: boolean;
}

export interface ProjectConfigModel {
  /**
   * Base directory all assets are loaded from. This is used to resolve relative
   * paths in the object setup and for other resources.
   */
  basedir?: string;
  /**
   * @deprecated The folder to load the object from. Legacy feature, currently not used and
   * might be removed in the future.
   */
  folder?: string;
  /**
   * A language map containing the translations for the intro texts. The key is
   * the language code and the value is the desired translation for that
   * language. This is a legacy feature and might be replaced in the future.
   */
  introText?: I18nLanguageMap;
  /**
   * A list of languages supported by the project. Pass all languages you want
   * to support here. The first language in the list is used as the default.
   */
  languages?: string[];
  /**
   * The name of the project. This is used to identify the project in the
   * project registry and for logging.
   */
  name?: string;
  /**
   * @deprecated The ID of the project. Legacy feature, currently not used anywhere and
   * might be removed in the future.
   */
  projectID?: string;
}

export interface SizeModel {
  width: number;
  height: number;
}

export type I18nTranslations = Record<string, string>;
export type I18nLanguageMap = Record<string, I18nTranslations>;

export type ClearColor = {
  alpha?: number;
  color: string;
};

export interface RenderConfigModel {
  /**
   * Whether the renderer should automatically clear the canvas before each
   * render call. Defaults to true.
   */
  autoClear: boolean;
  /**
   * The color to clear the canvas with. Defaults to black with an alpha of 0.
   */
  clearColor: ClearColor;
  /**
   * Whether the renderer should continuously render the scene. Defaults to
   * false, which only renders a single frame. If set to false, the controls
   * will cause a rerender when clicking and dragging the mouse, thus only
   * rendering when necessary. Animations require this to be true to work.
   */
  continuousRendering: boolean;
  /**
   * The color space to use for rendering. Defaults to SRGBColorSpace.
   */
  outputColorSpace: ColorSpace;
  /**
   * The pixel ratio to use for rendering. Defaults to 1. Might be interesting
   * for high resolution displays.
   */
  pixelRatio: number;
  /**
   * The size to render the scene at. Defaults to 1024x768. If using the canvas
   * viewer, this will be automatically set to the size of the canvas with a
   * window resize listener.
   */
  renderSize: SizeModel;
  /**
   * Whether to enable shadow maps. Defaults to true.
   */
  shadowMapEnabled: boolean;
  /**
   * The type of shadow map to use. Defaults to PCFSoftShadowMap.
   */
  shadowMapType: ShadowMapType;
}

export interface CameraConfigModel {
  /**
   * Aspect ratio of the camera, should match the render size aspect ratio.
   * Defaults to 1024 / 768.
   */
  aspect: number;
  /**
   * The far clipping plane of the camera. Defaults to 20000.
   */
  far: number;
  /**
   * The field of view of the camera in degrees. Defaults to 37.
   */
  fov: number;
  /**
   * The near clipping plane of the camera. Defaults to 0.1.
   */
  near: number;
  /**
   * The position of the camera. Defaults to (10, 10, 5).
   */
  position: Vector3;
  /**
   * The target of the camera. Defaults to (0, 0, 0).
   */
  target: Vector3;

  [key: string]: unknown;
}

export interface IViewer {
  animationService: IAnimationService;
  assetService: IAssetService;
  configService: IConfigService;
  controlService: IControlService;
  featureService: IFeatureService;
  init(config: ViewerConfigModel, context?: HTMLElement | WebGL2RenderingContext): void;
  lightService: ILightService;
  materialService: IMaterialService;
  renderService: IRenderService;
  sceneService: ISceneService;
}

export interface ViewerLauncherConfig {
  /**
   * A map of custom services to use instead of the default ones. Services must
   * fulfill the interface to the service they are replacing
   */
  customManager?: CustomManagerMap;
  /**
   * Logger to use in the services and features. If not provided, a default
   * logger is used that will behave as if it was in a production environment.
   */
  logger?: ILogger;
  /**
   * Options to configure the internal logger in the viewer. Can be supplied
   * instead of a logger instance if the logger needs to be configured, but not
   * used outside the viewer.
   */
  loggerOptions?: LoggerOptions;
}

export interface IViewerLauncher {
  /**
   * Creates a new canvas viewer instance. If the context is an HTML element,
   * the viewer will append its canvas object to the provided context. If the
   * context is a WebGL2RenderingContext, the viewer will use the provided
   * context to render to.
   *
   * @param config Configuration object for the viewer
   * @param context The context to render to
   */
  createCanvasViewer(config: ViewerConfigModel, context: HTMLElement | WebGL2RenderingContext): void;

  /**
   * Creates a new image viewer instance. Rendered images will be emitted as
   * base64 encoded image source strings.
   *
   * @param config Configuration object for the viewer
   * @returns An observable emitting each rendered image as a base64 encoded
   * image source string
   */
  createImageViewer(config: ViewerConfigModel): Observable<string>;
}

/**
 * The ID of an animation in the animation service. It consists of the name of
 * the object that has the animation and the name of the animation itself.
 */
export interface AnimationIdModel {
  objectName: string;
  animationName: string;
}

/**
 * A map listing the current playback time and the total duration for each
 * currently active animation. The key is the animation name.
 */
export interface AnimationTimeMap {
  [key: string]: {
    duration: number;
    time: number;
  };
}

/**
 * The animation service handles animations for all objects loaded in the
 * viewer. It provides access to the animations and object mixers for each
 * object and keeps track of the animation clock. To play any animations for an
 * object, a mixer has to be registered for it with animation service.
 *
 * Currently running animations are updated before each render call
 * automatically.
 */
export interface IAnimationService {
  /**
   * Adds a mixer for the given object to the animation service. If the object
   * has no animations or no name, no mixer is created and false is returned.
   * Otherwise, the mixer is created and returned.
   *
   * @param object The object to add a mixer for
   * @returns The mixer for the given object or false if no mixer was created
   */
  addMixerForObject(object: Object3D): AnimationMixer | false;
  /**
   * Returns the list of currently running animations as an observable.
   *
   * @returns The list of currently running animations
   */
  getActiveAnimations(): Observable<AnimationAction[]>;

  /**
   * Returns the current playback time and total duration for each currently
   * active animation as an observable.
   *
   * @returns An observable emitting a time map for all currently active animations
   */
  getActiveAnimationTime(): Observable<AnimationTimeMap>;
  /**
   * Returns the mixer for the given object name. If no mixer is available for
   * the given object, an error is thrown. Mixers have to be registered with
   * the animation service before they can be retrieved.
   *
   * @param objectName The name of the object to get the mixer for
   * @returns The mixer for the given object
   */
  getMixerForObject(objectName: string): AnimationMixer;
  /**
   * Returns a list of all available mixers as an observable.
   *
   * @returns The list of all available mixers
   */
  getMixers(): Observable<Record<string, AnimationMixer>>;
  /**
   * Plays the animation matching the given animation id. If the animation id is
   * invalid or the animation could not be played, false is returned.
   *
   * @param animId An object containing the name of the object and the name of the animation to play
   * @returns The animation action for the animation or false if the animation could not be played
   */
  playObjectAnimation(animId: AnimationIdModel): AnimationAction | false;
  /**
   * Starts or stops playback of all currently active animations.
   *
   * @param enabled Whether to enable or disable animation playback
   */
  setAnimationEnabled(enabled: boolean): void;
  /**
   * Sets the time of all currently active animations to the given time. If the
   * time is invalid, nothing happens.
   *
   * @param time The time to set the animations to in seconds
   */
  setAnimationTime(time: number): void;
}

export interface IAssetService {
  readonly hookObjectLoaded$: Observable<Object3D>;
  getIsLoading(): Observable<boolean>;
  loadCubeTexture(envName: string, imageSuffix?: string): Promise<CubeTexture>;
  loadEnvironmentMap(path: string, resolution: number, renderer: WebGLRenderer): Promise<WebGLCubeRenderTarget>;
  loadObject(path: string): Promise<Object3D>;
  loadTexture(path: string): Promise<Texture>;
}

// TODO: Rethink concept for material assignment, material slots and identifying materials
export interface IMaterialService {
  addMaterial(material: Material): void;
  getAssignedMaterials(): Observable<Record<string, Material>>;
  getMaterials(): Observable<Material[]>;
  setAssignedMaterial(materialSlot: string, material: Material): void;
  setMaterialProperties(materials: Record<string, Partial<Material>>): void;
}

export interface IRenderService {
  readonly hookAfterRender$: Observable<boolean>;
  readonly hookBeforeRender$: Observable<boolean>;
  readonly renderer: WebGLRenderer;
  getCamera(): Observable<PerspectiveCamera>;
  getRenderConfig(): Observable<RenderConfigModel>;
  init(context?: HTMLElement | WebGL2RenderingContext): void;
  renderSingleFrame(): void;
  setCameraConfig(config: Partial<CameraConfigModel>): void;
  setPostProcessingEnabled(enabled: boolean): void;
  setRenderConfig(config: Partial<RenderConfigModel>): void;
}

export interface ISceneService {
  readonly objectAddedToScene$: Observable<Object3D>;
  readonly scene: Scene;
  addObjectToScene(object: Object3D, objectSetup?: ObjectSetupModel): void;
  getObjects(): Observable<Object3D[]>;
  removeObjectFromScene(objectName: string): void;
}

export interface LightSetupModel {
  angle?: number;
  castShadow?: boolean;
  color: string;
  decay?: number;
  distance?: number;
  intensity?: number;
  name: string;
  penumbra?: number;
  position?: {
    x: number;
    y: number;
    z: number;
  };
  shadow?: {
    bias?: number;
    camera?: {
      far?: number;
      near?: number;
    };
    focus?: number;
    mapSize?: {
      height: number;
      width: number;
    };
    normalBias?: number;
    radius?: number;
  };
  type: LightType;
}

export interface ILightService {
  addLights(lights: Record<string, Light>): void;
  getLights(): Observable<Record<string, Light>>;
  removeLights(names?: string[]): void;
}

export interface IControlService {
  getControls(): Observable<OrbitControls | null>;
}

export interface IConfigService {
  getConfig(): Observable<ViewerConfigModel>;
  loadConfig(config: ViewerConfigModel): void;
}

export type ILoggerService = {
  init(loggerOptions?: LoggerOptions, logger?: ILogger): void;
} & ILogger;

export interface CustomManagerMap {
  animation?: interfaces.Newable<IAnimationService>;
  asset?: interfaces.Newable<IAssetService>;
  config?: interfaces.Newable<IConfigService>;
  control?: interfaces.Newable<IControlService>;
  feature?: interfaces.Newable<IFeatureService>;
  featureRegistry?: interfaces.Newable<IFeatureRegistryService>;
  light?: interfaces.Newable<ILightService>;
  logger?: interfaces.Newable<ILoggerService>;
  material?: interfaces.Newable<IMaterialService>;
  render?: interfaces.Newable<IRenderService>;
  scene?: interfaces.Newable<ISceneService>;
}
