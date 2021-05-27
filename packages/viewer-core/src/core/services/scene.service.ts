import {Object3D, PerspectiveCamera, Scene} from 'three';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {ISceneService} from '../../types';
import {provide} from 'inversify-binding-decorators';


@provide(SceneService)
export class SceneService implements ISceneService {
    readonly scene: Scene;
    private camera: PerspectiveCamera;
    private camera$: BehaviorSubject<PerspectiveCamera | null>;
    private objects: Object3D[];
    private objects$: BehaviorSubject<Object3D[]>;

    constructor() {
        this.camera$ = new BehaviorSubject<PerspectiveCamera | null>(null);
        this.objects = [];
        this.objects$ = new BehaviorSubject<Object3D[]>(this.objects);
        this.scene = new Scene();
    }



    addObjectToScene(object: Object3D): void {
    }

    getCamera(): Observable<PerspectiveCamera | null> {
        return this.camera$.asObservable();
    }

    getObjects(): Observable<Object3D[]> {
        return this.objects$.asObservable();
    }

    removeObjectFromScene(objectName: string): void {
    }

    setCamera(camera: PerspectiveCamera): void {
        this.camera = camera;
        this.camera$.next(this.camera);
    }
}