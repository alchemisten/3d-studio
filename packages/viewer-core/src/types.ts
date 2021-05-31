import {
    AnimationAction,
    AnimationMixer, Color,
    Light,
    Material,
    Object3D,
    PerspectiveCamera,
    Scene, ShadowMapType,
    Texture, TextureEncoding,
    Vector3,
    WebGLCubeRenderTarget,
    WebGLRenderer
} from 'three';
import {Observable, Subject} from 'rxjs';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';

export interface ViewerStateModel {}
export interface ViewerConfigModel {
    objects: ObjectSetupModel[];
}
export interface ObjectSetupModel {
    name: string;
    path: string;
}

export interface SizeModel {
    width: number;
    height: number;
}


export type I18nStringModel = Record<string, Record<string, string>>;


export type HighlightModelId = string;
export interface HighlightModel {
    cameraTarget: Vector3;
    description: string;
    i18n: I18nStringModel;
    id: HighlightModelId;
    name: string;
    object: Object3D;
    position: Vector3;
}

export type LightScenarioId = string;
export interface LightScenarioModel {
    i18n: I18nStringModel;
    id: LightScenarioId;
    lights: Light[];
    backgroundEnvironment: string; // Background image or skybox
    reflectionEnvironment: WebGLCubeRenderTarget;
}


export type UIControlId = string;
export interface UIControlModel {
    controls?: UIControlModel[];
    i18n: I18nStringModel;
    id: UIControlId;
    type: any;
    value: any;
}


export type ClearColor = {
    alpha?: number;
    color: string;
};


export interface RenderConfigModel {
    autoClear: boolean;
    clearColor: ClearColor;
    outputEncoding: TextureEncoding;
    pixelRatio: number;
    renderSize: SizeModel;
    shadowMapEnabled: boolean;
    shadowMapType: ShadowMapType;
}


export interface IControllable<ControllableState> {
    getControls(): UIControlModel[];
    getState(): Observable<ControllableState>;
}

export type FeatureId = string;
export interface IFeature<FeatureState> extends IControllable<FeatureState> {
    i18n: I18nStringModel;
    id: FeatureId;
    getEnabled(): Observable<boolean>;
    toggle(): void;
}

export interface LightScenarioFeatureState {}
export interface ILightScenarioFeature extends IFeature<LightScenarioFeatureState> {
    // lightService: ILightService;
    getActiveScenario(): Observable<LightScenarioModel>;
    getLightScenarios(): LightScenarioModel[];
    setActiveScenario(name: string): void;
}


export interface HighlightFeatureState {}
export interface IHighlightFeature extends IFeature<HighlightFeatureState> {
    // sceneService: ISceneService;
    focusHighlight(highlightId: string): void;
    getFocusedHighlight(): Observable<HighlightModel | null>;
    getHighlights(): HighlightModel[];
}


export interface CameraRotationFeatureState {}
export interface ICameraRotationFeature extends IFeature<CameraRotationFeatureState> {
    // controls: OrbitControls;
    setRotationEnabled(enabled: boolean): void;
}


export interface WireframeFeatureState {}
export interface IWireframeFeature extends IFeature<WireframeFeatureState> {
    // materialService: IMaterialService;
    setWireframeEnabled(enabled: boolean): void;
}


export interface MaterialChangerFeatureState {}
export interface IMaterialChangeFeature extends IFeature<MaterialChangerFeatureState> {
    // materialService: IMaterialService;
    addNewMaterial(material: Material): void;
    assignMaterialToSlot(slotName: string, material: Material): void;
    changeMaterialColor(materialName: string, color: Color): void;
    getColorOptionsForMaterial(materialName: string): Color[];
    getMaterials(): Observable<Material[]>;
}


export interface ViewerState {}
export interface IViewer extends IControllable<ViewerState> {
    // animationService: IAnimationService;
    // assetService: IAssetService;
    // featureService: IFeatureService;
    // materialService: IMaterialService;
    // lightService: ILightService;
    // renderService: IRenderService;
    // sceneService: ISceneService;
    init(node: HTMLElement, config: ViewerConfigModel): void;
}


export interface AnimationIdModel {
    objectId: string;
    animationName: string;
}


export interface IAnimationService {
    addMixerForObject(object: Object3D): boolean;
    getActiveAnimations(): Observable<AnimationAction[]>;
    getMixers(): Observable<Record<string, AnimationMixer>>;
    getMixerForObject(objectId: string): AnimationMixer | null;
    playObjectAnimation(objectId: string, animName: string): void;
    setAnimationTime(time: number, animIds?: AnimationIdModel[]): void;
    setAnimationEnabled(enabled: boolean, animIds?: AnimationIdModel[]): void;
}


export interface IAssetService {
    // renderService: IRenderService;
    hookObjectLoaded$: Subject<Object3D>;
    loadEnvironmentMap(path: string, resolution: number): Promise<WebGLCubeRenderTarget>;
    loadObject(path: string): Promise<Object3D>;
    loadTexture(): Promise<Texture>;
}


export interface IFeatureService<FeatureState> {
    addFeature(feature: IFeature<FeatureState>): void;
    getFeatures(): Observable<IFeature<FeatureState>[]>;
    removeFeature(featureId: string): void;
    setFeatureEnabled(featureId: string, enabled: boolean): void;
}


export enum MaterialType {
    Basic = 'basic',
    Lambert = 'lambert',
    Phong = 'phong',
    Physical = 'physical',
    Standard = 'standard'
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
    skinning: boolean;
    specular: string;
    specularMap?: string;
    type: MaterialType;
}


export interface IMaterialService {
    // assetService: IAssetService;
    createMaterials(materialObjects: MaterialSetupModel[]): void;
    getAssignedMaterials(): Observable<Record<string, Material[]>>;
    getMaterials(): Observable<Material[]>;
    setAssignedMaterial(materialSlot: string, material: Material): void;
    setMaterialProperties(materials: Record<string, Partial<Material>>): void;
}


export interface IRenderService {
    readonly composer: EffectComposer;
    hookAfterRender$: Subject<boolean>;
    hookBeforeRender$: Subject<boolean>;
    readonly renderer: WebGLRenderer;
    getRenderConfig(): Observable<RenderConfigModel>;
    renderSingleFrame(): void;
    setContinuousRenderingEnabled(enabled: boolean): void;
    setPostProcessingEnabled(enabled: boolean): void;
    setRenderConfig(config: Partial<RenderConfigModel>): void;
}


export interface ISceneService {
    readonly scene: Scene;
    addObjectToScene(object: Object3D): void;
    getCamera(): Observable<PerspectiveCamera | null>;
    getObjects(): Observable<Object3D[]>;
    removeObjectFromScene(objectName: string): void;
    setCamera(camera: PerspectiveCamera, position?: Vector3, target?: Vector3): void;
}


export interface ILightService {
    addLights(lights: Record<string, Light>): void;
    getLights(): Observable<Record<string, Light>>;
    removeLights(names?: string[]): void;
}
