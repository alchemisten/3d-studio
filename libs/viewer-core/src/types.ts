import {
  AnimationAction,
  AnimationMixer,
  Color,
  Light,
  Material,
  Object3D,
  PerspectiveCamera,
  Scene,
  ShadowMapType,
  Texture,
  TextureEncoding,
  Vector2,
  Vector3,
  WebGLCubeRenderTarget,
  WebGLRenderer,
} from 'three';
import { Observable } from 'rxjs';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import type { Container, interfaces } from 'inversify';
import { LightType, MaterialType } from './enums';

export type FeatureSetup = Record<string, FeatureConfig>;
export interface ViewerConfigModel {
  camera?: Partial<CameraConfigModel>;
  features?: FeatureSetup;
  objects: ObjectSetupModel[];
  project?: ProjectConfigModel;
  render?: Partial<RenderConfigModel>;
}
export interface ObjectSetupModel {
  name: string;
  path: string;
}

export interface ProjectConfigModel {
  basedir: string;
  folder: string;
  introText: I18nLanguageMap;
  languages: string[];
  name: string;
  projectID: string;
}

export interface SizeModel {
  width: number;
  height: number;
}

export type I18nTranslations = Record<string, string>;
export type I18nLanguageMap = Record<string, I18nTranslations>;

export type HighlightWorldPosition = { positionType: 'WORLD'; position: Vector3 };
export type HighlightScreenPosition = { positionType: 'SCREEN'; position: Vector2 };
export type HighlightModelId = string;
export type HighlightModel = {
  cameraPosition: Vector3;
  cameraTarget: Vector3;
  description: string;
  i18n: I18nLanguageMap;
  id: HighlightModelId;
  name: string;
  object: Object3D;
} & (HighlightWorldPosition | HighlightScreenPosition);

export type LightScenarioId = string;
export interface LightScenarioModel {
  i18n: I18nLanguageMap;
  id: LightScenarioId;
  lights: Record<string, Light>;
  lightSetups?: LightSetupModel[];
  backgroundEnvironment?: string; // Background image or skybox
  reflectionEnvironment?: WebGLCubeRenderTarget;
}

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
  outputEncoding: TextureEncoding;
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

export type FeatureId = symbol;
export interface FeatureConfig {
  enabled: boolean;
  [key: string]: string | number | boolean | object | undefined;
}
export interface IFeature {
  id: FeatureId;
  getEnabled(): Observable<boolean>;
  init(config: FeatureConfig): void;
  setEnabled(enabled: boolean): void;
}

export interface LightScenarioFeatureConfig extends FeatureConfig {
  initialScenarioId: string;
  makeStudioDefaultSelectable?: boolean;
  scenarios: LightScenarioModel[];
}

export interface ILightScenarioFeature extends IFeature {
  getActiveScenario(): Observable<LightScenarioModel>;
  getLightScenarios(): LightScenarioModel[];
  setActiveScenario(id: LightScenarioId): void;
}

export interface IHighlightFeature extends IFeature {
  focusHighlight(id: HighlightModelId): void;
  getFocusedHighlight(): Observable<HighlightModel | null>;
  getHighlights(): HighlightModel[];
}

export interface CameraRotationFeatureConfig extends FeatureConfig {
  rotationSpeed?: number;
}
export interface ICameraRotationFeature extends IFeature {
  setRotationEnabled(enabled: boolean): void;
  setRotationSpeed(speed: number): void;
}

export interface IWireframeFeature extends IFeature {
  setWireframeEnabled(enabled: boolean): void;
}

export interface IMaterialChangeFeature extends IFeature {
  addNewMaterial(material: Material): void;
  assignMaterialToSlot(slotName: string, material: Material): void;
  changeMaterialColor(materialName: string, color: Color): void;
  getColorOptionsForMaterial(materialName: string): Color[];
  getMaterials(): Observable<Material[]>;
}

export interface IViewer {
  init(screenSize: SizeModel, config: ViewerConfigModel, node?: HTMLElement): void;
}

export interface IViewerLauncher {
  createHTMLViewer(node: HTMLElement, config: ViewerConfigModel): void;
  createImageViewer(renderSize: SizeModel, config: ViewerConfigModel): Observable<string>;
}

export interface AnimationIdModel {
  objectName: string;
  animationName: string;
}

export interface IAnimationService {
  addMixerForObject(object: Object3D): boolean;
  getActiveAnimations(): Observable<AnimationAction[]>;
  getMixers(): Observable<Record<string, AnimationMixer>>;
  getMixerForObject(objectId: string): AnimationMixer;
  playObjectAnimation(animId: AnimationIdModel): void;
  setAnimationEnabled(enabled: boolean): void;
  setAnimationTime(time: number): void;
}

export interface IAssetService {
  readonly hookObjectLoaded$: Observable<Object3D>;
  loadEnvironmentMap(path: string, resolution: number): Promise<WebGLCubeRenderTarget>;
  loadObject(path: string): Promise<Object3D>;
  loadTexture(path: string): Promise<Texture>;
}

export interface IFeatureService {
  addFeature(feature: IFeature): void;
  getFeatures(): Observable<IFeature[]>;
  removeFeature(featureId: symbol): void;
  setFeatureEnabled(featureId: symbol, enabled: boolean): void;
}

export interface IFeatureRegistryService {
  getFeatureInstance(id: string): IFeature;
  registerFeature(id: string, feature: interfaces.ServiceIdentifier<IFeature>): void;
  setDIContainer(containerDI: Container): void;
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
  readonly scene: Scene;
  addObjectToScene(object: Object3D): void;
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
    camera?: {
      far?: number;
      near?: number;
    };
    focus?: number;
    mapSize?: {
      height: number;
      width: number;
    };
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
