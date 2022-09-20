import { inject, injectable } from 'inversify';
import { Group, Object3D, Scene } from 'three';
import { BehaviorSubject, Observable } from 'rxjs';
import type { ILoggerService, ISceneService } from '../../types';
import { LoggerServiceToken } from '../../util';

/**
 * The scene service provides access to the rendered scene and keeps track of
 * all objects within. All loaded objects should be added to and removed from
 * the scene via this service.
 */
@injectable()
export class SceneService implements ISceneService {
  public readonly scene: Scene;
  private readonly group: Object3D;
  private objects$: BehaviorSubject<Object3D[]>;

  public constructor(@inject(LoggerServiceToken) private logger: ILoggerService) {
    this.scene = new Scene();
    this.group = new Group();
    this.group.name = 'objects';
    this.scene.add(this.group);
    this.objects$ = new BehaviorSubject<Object3D[]>(this.group.children);
  }

  public addObjectToScene(object: Object3D): void {
    this.group.add(object);
    this.logger.debug('Object added', { objects: this.group });
    this.objects$.next(this.group.children);
  }

  public getObjects(): Observable<Object3D[]> {
    return this.objects$.asObservable();
  }

  public removeObjectFromScene(objectName: string): void {
    this.group.traverse((object) => {
      if (object.name === objectName && object.parent) {
        object.parent.remove(object);
      }
    });
    this.objects$.next(this.group.children);
  }
}
