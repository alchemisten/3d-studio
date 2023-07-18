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
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import type { ILogger } from '@schablone/logging';
import type { FeatureSetup, IFeatureService } from './feature';
import { LightType, MaterialType } from './enums';

export interface ViewerConfigModel {
  camera?: Partial<CameraConfigModel>;
  features?: FeatureSetup;
  objects: ObjectSetupModel[];
  project?: ProjectConfigModel;
  render?: Partial<RenderConfigModel>;
}
export interface ObjectSetupModel {
  castShadow?: boolean;
  name?: string;
  path: string;
  scale?: number;
  receiveShadow?: boolean;
}

export interface ProjectConfigModel {
  basedir?: string;
  folder?: string;
  introText?: I18nLanguageMap;
  languages?: string[];
  name?: string;
  projectID?: string;
}

export interface SizeModel {
  width: number;
  height: number;
}

export type I18nTranslations = Record<string, string>;
export type I18nLanguageMap = Record<string, I18nTranslations>;

export type UIControlId = string;
export interface UIControlModel {
  controls?: UIControlModel[];
  i18n: I18nLanguageMap;
  id: UIControlId;
  type: unknown;
  value: unknown;
}

export type ClearColor = {
  alpha?: number;
  color: string;
};

export interface RenderConfigModel {
  autoClear: boolean;
  clearColor: ClearColor;
  continuousRendering: boolean;
  outputColorSpace: ColorSpace;
  pixelRatio: number;
  renderSize: SizeModel;
  shadowMapEnabled: boolean;
  shadowMapType: ShadowMapType;
}

export interface CameraConfigModel {
  aspect: number;
  far: number;
  fov: number;
  near: number;
  position: Vector3;
  target: Vector3;

  [key: string]: unknown;
}

export interface IControllable {
  getControls(): UIControlModel[];
}

export interface IViewer {
  animationService: IAnimationService;
  assetService: IAssetService;
  configService: IConfigService;
  controlService: IControlService;
  featureService: IFeatureService;
  init(screenSize: SizeModel, config: ViewerConfigModel, node?: HTMLElement): void;
  lightService: ILightService;
  materialService: IMaterialService;
  renderService: IRenderService;
  sceneService: ISceneService;
}

export interface IViewerLauncher {
  createHTMLViewer(node: HTMLElement, config: ViewerConfigModel): void;
  createImageViewer(renderSize: SizeModel, config: ViewerConfigModel): Observable<string>;
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
  loadEnvironmentMap(path: string, resolution: number): Promise<WebGLCubeRenderTarget>;
  loadObject(path: string): Promise<Object3D>;
  loadTexture(path: string): Promise<Texture>;
}

export interface MaterialSetupModel {
  alphaMap?: string;
  aoMap?: string;
  aoMapIntensity?: number;
  bumpMap?: string;
  bumpScale?: number;
  changeable: boolean;
  clearCoat?: number;
  clearCoatRoughness?: number;
  color: string;
  combine: number;
  displacementMap: string;
  displacementScale: number;
  displacementBias: number;
  emissive: string;
  emissiveMap?: string;
  emissiveIntensity?: number;
  envID: number;
  global: boolean;
  id: number;
  illum: number;
  lights: boolean;
  map?: string;
  metalness?: number;
  metalnessMap?: string;
  name: string;
  normalMap?: string;
  normalMapScale?: number;
  opacity: number;
  reflectivity: number;
  refractionRatio: number;
  roughness?: number;
  roughnessMap?: string;
  side: number;
  shininess: number;
  specular: string;
  specularMap?: string;
  type: MaterialType;
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
  readonly composer: EffectComposer;
  readonly hookAfterRender$: Observable<boolean>;
  readonly hookBeforeRender$: Observable<boolean>;
  readonly renderer: WebGLRenderer;
  getCamera(): Observable<PerspectiveCamera>;
  getRenderConfig(): Observable<RenderConfigModel>;
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
  getControls(): Observable<OrbitControls>;
}

export interface IConfigService {
  getConfig(): Observable<ViewerConfigModel>;
  loadConfig(config: ViewerConfigModel): void;
}

export type ILoggerService = ILogger;
