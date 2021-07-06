import {
    EquirectangularReflectionMapping,
    LoadingManager,
    Object3D, sRGBEncoding,
    Texture,
    TextureLoader,
    WebGLCubeRenderTarget
} from 'three';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader';
import {GLTF, GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {Observable, Subject} from 'rxjs';
import {IAssetService} from '../../types';
import {RenderService} from './render.service';
import {Constants} from 'util/constants';
import {provideSingleton} from 'util/inversify';



/**
 * The asset service handles all file loading for the 3D scene, like
 * object files and textures and should be used for any loading activity
 * so it can be tracked. All loading is done via a central loading manager
 * to keep track of requested and loaded files as accurately as possible. Due
 * to the implementation of the loaders in three.js, the file count is not
 * entirely reliable.
 *
 * TODO: Look into implementing more reliable file count and possible file size tracking
 */
@provideSingleton(AssetService)
export class AssetService implements IAssetService {
    readonly hookObjectLoaded$: Observable<Object3D>;
    private readonly dracoLoader: DRACOLoader;
    private readonly gltfLoader: GLTFLoader;
    private readonly objectLoaded$: Subject<Object3D>;
    private readonly loadingManager: LoadingManager;
    private readonly textureLoader: TextureLoader;

    constructor(
        private renderService: RenderService
    ) {
        this.loadingManager = new LoadingManager(
            this.onLoadingComplete.bind(this),
            this.onLoadingProgress.bind(this),
            this.onLoadingError.bind(this)
        );
        this.dracoLoader = new DRACOLoader(this.loadingManager);
        this.dracoLoader.setDecoderPath(Constants.DRACO_GOOGLE_STATIC_DECODER_URL);
        this.gltfLoader = new GLTFLoader(this.loadingManager);
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
        this.textureLoader = new TextureLoader(this.loadingManager);
        this.objectLoaded$ = new Subject();
        this.hookObjectLoaded$ = this.objectLoaded$.asObservable();
    }



    loadEnvironmentMap(path: string, resolution: number): Promise<WebGLCubeRenderTarget> {
        return this.loadTexture(path).then((envTex: Texture) => {
            envTex.mapping = EquirectangularReflectionMapping; // SphericalReflectionMapping
            envTex.encoding = sRGBEncoding;
            return new WebGLCubeRenderTarget(resolution).fromEquirectangularTexture(this.renderService.renderer, envTex);
        });
    }


    loadObject(path: string): Promise<Object3D> {
        const [type] = path.split('.').slice(-1);
        switch (type) {
            case 'gltf':
                return this.loadGLTF(path).then(gltf => {
                    gltf.scene.animations = gltf.animations;
                    this.objectLoaded$.next(gltf.scene);
                    return gltf.scene;
                });
            default:
                return new Promise((resolve, reject) => {
                    reject(`Object type unknown: ${type}`);
                });
        }
    }


    loadTexture(path: string): Promise<Texture> {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                path,
                texture => {
                    resolve(texture);
                },
                undefined,
                error => {
                    reject(error);
                });
        });
    }


    private loadGLTF(path: string): Promise<GLTF> {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                path,
                (gltf: GLTF) => {
                    console.log(gltf);
                    resolve(gltf);
                },
                undefined,
                error => {
                    reject(error);
                }
            );
        });
    }


    private onLoadingComplete(): void {
        console.log('Loading complete');
    }


    private onLoadingError(url: string): void {
        console.error(`Error loading ${url}`);
    }


    private onLoadingProgress(url: string, itemsLoaded: number, itemsTotal: number): void {
        console.log(`Finished file: ${url}.\nLoaded ${itemsLoaded} of ${itemsTotal} files.`);
    }
}
