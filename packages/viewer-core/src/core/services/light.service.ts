import { AmbientLight, DirectionalLight, Group, Light, Object3D } from 'three';
import { BehaviorSubject, Observable } from 'rxjs';
import { ILightService } from '../../types';
import { SceneService } from './scene.service';
import { provideSingleton } from 'util/inversify';



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
}