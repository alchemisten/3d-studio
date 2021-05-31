import {Group, Object3D, PerspectiveCamera, Scene, Vector3} from 'three';
import {BehaviorSubject, Observable} from 'rxjs';
import {ISceneService} from '../../types';
import {provideSingleton} from 'util/inversify';



@provideSingleton(SceneService)
export class SceneService implements ISceneService {
    readonly scene: Scene;
    private camera: PerspectiveCamera;
    private camera$: BehaviorSubject<PerspectiveCamera | null>;
    private readonly group: Object3D;
    private objects$: BehaviorSubject<Object3D[]>;

    constructor() {
        this.camera$ = new BehaviorSubject<PerspectiveCamera | null>(null);
        this.scene = new Scene();
        this.group = new Group();
        this.group.name = 'objects';
        this.scene.add(this.group);
        this.objects$ = new BehaviorSubject<Object3D[]>(this.group.children);
    }



    addObjectToScene(object: Object3D): void {
        this.group.add(object);
        this.objects$.next(this.group.children);
        console.log('Object added', this.group);
    }

    getCamera(): Observable<PerspectiveCamera | null> {
        return this.camera$.asObservable();
    }

    getObjects(): Observable<Object3D[]> {
        return this.objects$.asObservable();
    }

    removeObjectFromScene(objectName: string): void {
        this.group.traverse(object => {
            if (object.name === objectName && object.parent) {
                object.parent.remove(object);
            }
        });
        this.objects$.next(this.group.children);
    }

    setCamera(camera: PerspectiveCamera, position?: Vector3, target?: Vector3): void {
        this.camera = camera;
        if (position) {
            this.camera.position.set(position.x, position.y, position.z);
        }
        if (target) {
            this.camera.lookAt(target);
        }
        this.camera.updateProjectionMatrix();
        this.camera$.next(this.camera);
    }
}