import { AmbientLight, DirectionalLight, Group, Light, Object3D, PointLight, SpotLight } from 'three';
import { BehaviorSubject, Observable } from 'rxjs';
import { provideSingleton } from 'util/inversify';
import { ILightService, LightSetupModel, LightType } from '../../types';
import { SceneService } from './scene.service';
import { UnknowLightTypeError } from '../exceptions';



/**
 * The light service keeps a record of all lights in the scene and should be
 * used any time lights are added or removed.
 */
@provideSingleton(LightService)
export class LightService implements ILightService {
    private readonly lightGroup: Object3D;
    private lights: Record<string, Light>;
    private lights$: BehaviorSubject<Record<string, Light>>;

    constructor(
        private sceneService: SceneService
    ) {
        this.lightGroup = new Group();
        this.lightGroup.name = 'lights';
        this.sceneService.scene.add(this.lightGroup);
        this.lights = {};
        this.lights$ = new BehaviorSubject(this.lights);
        this.addDefaultLights();
    }



    addLights(lights: Record<string, Light>): void {
        Object.keys(lights).forEach(key => {
            if (this.lights[key]) {
                this.removeLights([key]);
            }

            this.lights[key] = (lights[key]);
            this.lightGroup.add(lights[key]);
        });
        this.lights$.next(this.lights);
    }


    getLights(): Observable<Record<string, Light>> {
        return this.lights$.asObservable();
    }


    removeLights(names?: string[]): void {
        if (names) {
            names.forEach(light => {
                if (this.lights[light]) {
                    this.lightGroup.remove(this.lights[light]);
                    delete this.lights[light];
                }
            });
        } else {
            this.lights = {};
            this.lightGroup.children = [];
        }
        this.lights$.next(this.lights);
    }


    private addDefaultLights() {
        const directionalLight = new DirectionalLight(0xffffff, 1.9);
        directionalLight.position.set(3, 10, -5);
        directionalLight.target = new Object3D();
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 60;
        this.addLights({
            'ambient': new AmbientLight('#aaaaaa'),
            'directional': directionalLight
        });
    }


    static transformLightSetup(setup: LightSetupModel): AmbientLight | DirectionalLight | PointLight | SpotLight {
        switch (setup.type) {
            case LightType.Ambient:
                return new AmbientLight(
                    setup.color,
                    setup.intensity
                );
            case LightType.Directional:
                const directionalLight = new DirectionalLight(
                    setup.color,
                    setup.intensity
                );
                directionalLight.castShadow = setup.castShadow || false;
                if (setup.position) {
                    directionalLight.position.set(setup.position.x, setup.position.y, setup.position.z);
                }
                return directionalLight;
            case LightType.Point:
                const pointLight = new PointLight(
                    setup.color,
                    setup.intensity || 1,
                    setup.distance || 0,
                    setup.decay || 1
                );
                if (setup.position) {
                    pointLight.position.set(setup.position.x, setup.position.y, setup.position.z);
                }
                return pointLight;
            case LightType.Spot:
                const spotLight = new SpotLight(
                    setup.color,
                    setup.intensity || 1,
                    setup.distance || 0,
                    setup.angle || Math.PI / 3,
                    setup.penumbra || 0,
                    setup.decay || 1
                );
                spotLight.castShadow = setup.castShadow || false;
                if (setup.position) {
                    spotLight.position.set(setup.position.x, setup.position.y, setup.position.z);
                }
                if (setup.shadow) {
                    spotLight.shadow.focus = setup.shadow.focus || 1;
                    if (setup.shadow.camera) {
                        spotLight.shadow.camera.far = setup.shadow.camera.far || 500;
                        spotLight.shadow.camera.near = setup.shadow.camera.near || 0.5;
                    }
                    if (setup.shadow.mapSize) {
                        spotLight.shadow.mapSize.height = setup.shadow.mapSize.height;
                        spotLight.shadow.mapSize.width = setup.shadow.mapSize.width;
                    }
                }
                return spotLight;
            default:
                throw new UnknowLightTypeError(`The light type ${setup.type} can not be resolved by the light service`);
        }
    }
}