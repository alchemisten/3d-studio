import { inject, injectable } from 'inversify';
import {
  CubeTexture,
  CubeTextureLoader,
  EquirectangularReflectionMapping,
  LoadingManager,
  Object3D,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  WebGLCubeRenderTarget,
  WebGLRenderer,
} from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import type { ILogger } from '@schablone/logging';
import type { IAssetService, IConfigService, ILoggerService } from '../../types';
import { ConfigServiceToken, Constants, LoggerServiceToken } from '../../util';

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
@injectable()
export class AssetService implements IAssetService {
  public readonly hookObjectLoaded$: Observable<Object3D>;
  private basePath = '';
  private assetMap: Record<string, Promise<unknown>> = {};
  private readonly cubeTextureLoader: CubeTextureLoader;
  private readonly dracoLoader: DRACOLoader;
  private readonly gltfLoader: GLTFLoader;
  private readonly isLoading$: BehaviorSubject<boolean>;
  private readonly objectLoaded$: Subject<Object3D>;
  private readonly loadingManager: LoadingManager;
  private readonly logger: ILogger;
  private readonly textureLoader: TextureLoader;

  public constructor(
    @inject(ConfigServiceToken) private configService: IConfigService,
    @inject(LoggerServiceToken) logger: ILoggerService
  ) {
    this.logger = logger.withOptions({ globalLogOptions: { tags: { Service: 'Asset' } } });
    this.loadingManager = new LoadingManager(
      this.onLoadingComplete.bind(this),
      this.onLoadingProgress.bind(this),
      this.onLoadingError.bind(this)
    );
    this.cubeTextureLoader = new CubeTextureLoader(this.loadingManager);
    this.dracoLoader = new DRACOLoader(this.loadingManager);
    this.dracoLoader.setDecoderPath(Constants.DRACO_GOOGLE_STATIC_DECODER_URL);
    this.gltfLoader = new GLTFLoader(this.loadingManager);
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
    this.textureLoader = new TextureLoader(this.loadingManager);
    this.objectLoaded$ = new Subject();
    this.hookObjectLoaded$ = this.objectLoaded$.asObservable();
    this.isLoading$ = new BehaviorSubject(false);
    this.configService.getConfig().subscribe((config) => {
      this.basePath = config.project?.basedir ? `${config.project.basedir.replace(/\/+$/, '')}/` : '';
    });
  }

  public getIsLoading(): Observable<boolean> {
    return this.isLoading$.asObservable();
  }

  public loadCubeTexture(path: string, imageSuffix = '.jpg'): Promise<CubeTexture> {
    if (this.isAssetRegistered(path)) {
      return this.assetMap[path] as Promise<CubeTexture>;
    }

    this.isLoading$.next(true);
    const directions = ['pos-x', 'neg-x', 'pos-y', 'neg-y', 'pos-z', 'neg-z'];

    this.assetMap[path] = new Promise((resolve, reject) => {
      this.cubeTextureLoader.setPath(`${this.basePath}${path}/`).load(
        directions.map((direction) => direction + imageSuffix),
        (texture) => {
          resolve(texture);
        },
        () => undefined,
        (error) => {
          reject(error);
        }
      );
    });

    return this.assetMap[path] as Promise<CubeTexture>;
  }

  public loadEnvironmentMap(path: string, resolution: number, renderer: WebGLRenderer): Promise<WebGLCubeRenderTarget> {
    return this.loadTexture(path).then((envTex: Texture) => {
      envTex.mapping = EquirectangularReflectionMapping; // SphericalReflectionMapping
      envTex.colorSpace = SRGBColorSpace;
      return new WebGLCubeRenderTarget(resolution).fromEquirectangularTexture(renderer, envTex);
    });
  }

  public loadObject(path: string): Promise<Object3D> {
    if (this.isAssetRegistered(path)) {
      return this.assetMap[path] as Promise<Object3D>;
    }

    this.isLoading$.next(true);
    const [type] = path.split('.').slice(-1);

    switch (type) {
      case 'gltf':
        this.assetMap[path] = this.loadGLTF(path).then((gltf) => {
          gltf.scene.animations = gltf.animations;
          this.objectLoaded$.next(gltf.scene);
          return gltf.scene;
        });
        break;
      default:
        this.assetMap[path] = Promise.reject(`Asset service can't handle object type: ${type}`);
        break;
    }

    return this.assetMap[path] as Promise<Object3D>;
  }

  public loadTexture(path: string): Promise<Texture> {
    if (this.isAssetRegistered(path)) {
      return this.assetMap[path] as Promise<Texture>;
    }

    this.isLoading$.next(true);
    this.assetMap[path] = new Promise((resolve, reject) => {
      this.textureLoader.load(
        `${this.basePath}${path}`,
        (texture) => {
          resolve(texture);
        },
        () => undefined,
        (error) => {
          reject(error);
        }
      );
    });

    return this.assetMap[path] as Promise<Texture>;
  }

  private loadGLTF(path: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        `${this.basePath}${path}`,
        (gltf: GLTF) => {
          this.logger.debug('GLTF loaded', { objects: gltf });
          resolve(gltf);
        },
        () => undefined,
        (error) => {
          reject(error);
        }
      );
    });
  }

  private onLoadingComplete(): void {
    this.logger.debug('Loading complete');
  }

  private onLoadingError(url: string): void {
    this.logger.error(`Error loading ${url}`);
  }

  private onLoadingProgress(url: string, itemsLoaded: number, itemsTotal: number): void {
    if (itemsLoaded === itemsTotal) {
      this.isLoading$.next(false);
    }
    this.logger.debug(`Finished file: ${url}.\nLoaded ${itemsLoaded} of ${itemsTotal} files.`);
  }

  private isAssetRegistered(path: string): boolean {
    return this.assetMap[path] !== undefined;
  }
}
