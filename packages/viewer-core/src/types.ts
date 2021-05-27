import {
    AnimationAction,
    AnimationMixer, Color,
    Light,
    Material,
    Object3D,
    PerspectiveCamera,
    Scene,
    Texture,
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

export interface HighlightModel {
    cameraTarget: Vector3;
    description: string;
    id: string;
    name: string;
    object: Object3D;
    position: Vector3;
}


export interface LightScenarioModel {
    name: string;
    lights: Light[];
}


export interface UIControlModel {
    controls?: UIControlModel[];
    label: string;
    type: any;
    value: any;
}


export interface IControllable<ControllableState> {
    getControls(): UIControlModel[];
    getState(): Observable<ControllableState>;
}


export interface IFeature<FeatureState> extends IControllable<FeatureState> {
    id: string;
    name: string;
    getEnabled(): Observable<boolean>;
    toggle(): void;
}


export interface ILightScenarioFeature<FeatureState> extends IFeature<FeatureState> {
    // lightService: ILightService;
    getActiveScenario(): Observable<LightScenarioModel>;
    getLightScenarios(): LightScenarioModel[];
    setActiveScenario(name: string): void;
}


export interface IHighlightFeature<FeatureState> extends IFeature<FeatureState> {
    // sceneService: ISceneService;
    focusHighlight(highlightId: string): void;
    getFocusedHighlight(): Observable<HighlightModel | null>;
    getHighlights(): HighlightModel[];
}


export interface ICameraRotationFeature<FeatureState> extends IFeature<FeatureState> {
    // controls: OrbitControls;
    setRotationEnabled(enabled: boolean): void;
}


export interface IWireframeFeature<FeatureState> extends IFeature<FeatureState> {
    // materialService: IMaterialService;
    setWireframeEnabled(enabled: boolean): void;
}


export interface IMaterialChangeFeature<FeatureState> extends IFeature<FeatureState> {
    // materialService: IMaterialService;
    addNewMaterial(material: Material): void;
    assignMaterialToSlot(slotName: string, material: Material): void;
    changeMaterialColor(materialName: string, color: Color): void;
    getColorOptionsForMaterial(materialName: string): Color[];
    getMaterials(): Observable<Material[]>;
}


export interface IViewer<ViewerState> extends IControllable<ViewerState> {
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
    init(node: HTMLElement): void;
    renderSingleFrame(): void;
    setContinuousRenderingEnabled(enabled: boolean): void;
    setPostProcessingEnabled(enabled: boolean): void;
}


export interface ISceneService {
    readonly scene: Scene;
    addObjectToScene(object: Object3D): void;
    getCamera(): Observable<PerspectiveCamera | null>;
    getObjects(): Observable<Object3D[]>;
    removeObjectFromScene(objectName: string): void;
    setCamera(camera: PerspectiveCamera): void;
}


export interface ILightService {
    addLights(lights: Record<string, Light>): void;
    getLights(): Observable<Light[]>;
    removeLights(names?: string[]): void;
}
