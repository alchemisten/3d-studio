import {Group, Object3D, Scene} from 'three';
import {BehaviorSubject, Observable} from 'rxjs';
import {ISceneService} from '../../types';
import {provideSingleton} from 'util/inversify';



/**
 * The scene service provides access to the rendered scene and keeps track of
 * all objects within. All loaded objects should be added to and removed from
 * the scene via this service.
 */
@provideSingleton(SceneService)
export class SceneService implements ISceneService {
    readonly scene: Scene;
    private readonly group: Object3D;
    private objects$: BehaviorSubject<Object3D[]>;

    constructor() {
        this.scene = new Scene();
        this.group = new Group();
        this.group.name = 'objects';
        this.scene.add(this.group);
        this.objects$ = new BehaviorSubject<Object3D[]>(this.group.children);
    }



    addObjectToScene(object: Object3D): void {
        this.group.add(object);
        console.log('Object added', this.group);
        this.objects$.next(this.group.children);
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
}