import { inject, injectable } from 'inversify';
import {
  AmbientLight,
  DirectionalLight,
  DirectionalLightHelper,
  Group,
  Light,
  Object3D,
  PointLight,
  PointLightHelper,
  SpotLight,
  SpotLightHelper,
} from 'three';
import { BehaviorSubject, Observable } from 'rxjs';
import type { ILightService, ISceneService, LightSetupModel } from '../../types';
import { UnknownLightTypeError } from '../exceptions';
import { SceneServiceToken } from '../../util';
import { LightType } from '../../enums';

/**
 * The light service keeps a record of all lights in the scene and should be
 * used any time lights are added or removed.
 */
@injectable()
export class LightService implements ILightService {
  private readonly lightGroup: Object3D;
  private lightHelpers: Record<string, Object3D>;
  private lights: Record<string, Light>;
  private lights$: BehaviorSubject<Record<string, Light>>;

  public constructor(@inject(SceneServiceToken) private sceneService: ISceneService) {
    this.lightGroup = new Group();
    this.lightGroup.name = 'lights';
    this.sceneService.scene.add(this.lightGroup);
    this.lights = {};
    this.lightHelpers = {};
    this.lights$ = new BehaviorSubject(this.lights);
    this.addDefaultLights();
  }

  public addLights(lights: Record<string, Light>): void {
    Object.entries(lights).forEach(([key, value]) => {
      if (this.lights[key]) {
        this.removeLights([key]);
      }

      // TODO: Activate light helpers via config
      // const helper = this.getHelperForLight(value);
      // if (helper) {
      //   this.lightHelpers[key] = helper;
      //   this.lightGroup.add(helper);
      // }

      this.lights[key] = value;
      this.lightGroup.add(value);
    });
    this.lights$.next(this.lights);
  }

  public getLights(): Observable<Record<string, Light>> {
    return this.lights$.asObservable();
  }

  public removeLights(names?: string[]): void {
    if (names) {
      names.forEach((light) => {
        if (this.lights[light]) {
          this.lightGroup.remove(this.lights[light]);
          delete this.lights[light];
        }
        if (this.lightHelpers[light]) {
          this.lightGroup.remove(this.lightHelpers[light]);
          delete this.lightHelpers[light];
        }
      });
    } else {
      this.lights = {};
      this.lightHelpers = {};
      this.lightGroup.children = [];
    }
    this.lights$.next(this.lights);
  }

  private addDefaultLights() {
    const directionalLight = new DirectionalLight(0xffffff, 6);
    directionalLight.position.set(3, 10, -5);
    directionalLight.target = new Object3D();
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 60;
    this.addLights({
      ambient: new AmbientLight('#aaaaaa'),
      directional: directionalLight,
    });
  }

  public static transformLightSetup(setup: LightSetupModel): AmbientLight | DirectionalLight | PointLight | SpotLight {
    switch (setup.type) {
      case LightType.Ambient:
        return new AmbientLight(setup.color, setup.intensity);
      case LightType.Directional: {
        const directionalLight = new DirectionalLight(setup.color, setup.intensity);
        LightService.performCommonLightSetup(directionalLight, setup);
        return directionalLight;
      }
      case LightType.Point: {
        const pointLight = new PointLight(setup.color, setup.intensity ?? 1, setup.distance ?? 0, setup.decay ?? 1);
        LightService.performCommonLightSetup(pointLight, setup);
        return pointLight;
      }
      case LightType.Spot: {
        const spotLight = new SpotLight(
          setup.color,
          setup.intensity ?? 1,
          setup.distance ?? 0,
          setup.angle ?? Math.PI / 3,
          setup.penumbra ?? 0,
          setup.decay ?? 1
        );
        LightService.performCommonLightSetup(spotLight, setup);
        return spotLight;
      }
      default:
        throw new UnknownLightTypeError(`The light type ${setup.type} can not be resolved by the light service`);
    }
  }

  private getHelperForLight(light: Light): Object3D | undefined {
    switch (light.type) {
      case 'DirectionalLight':
        return new DirectionalLightHelper(light as DirectionalLight);
      case 'PointLight':
        return new PointLightHelper(light as PointLight);
      case 'SpotLight':
        return new SpotLightHelper(light as SpotLight);
      default:
        return;
    }
  }

  public static performCommonLightSetup(light: PointLight | SpotLight | DirectionalLight, setup: LightSetupModel) {
    if (setup.position) {
      light.position.set(setup.position.x, setup.position.y, setup.position.z);
    }
    light.castShadow = setup.castShadow ?? false;
    if (setup.shadow) {
      light.shadow.bias = setup.shadow.bias ?? 0;
      light.shadow.normalBias = setup.shadow.normalBias ?? 0;
      if (setup.shadow.camera) {
        light.shadow.camera.far = setup.shadow.camera.far ?? 500;
        light.shadow.camera.near = setup.shadow.camera.near ?? 0.5;
      }
      if (setup.shadow.mapSize) {
        light.shadow.mapSize.height = setup.shadow.mapSize.height;
        light.shadow.mapSize.width = setup.shadow.mapSize.width;
      }
    }
  }
}
