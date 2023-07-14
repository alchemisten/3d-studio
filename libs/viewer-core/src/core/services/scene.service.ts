import { inject, injectable } from 'inversify';
import { Group, Mesh, Object3D, Scene } from 'three';
import { BehaviorSubject, Observable } from 'rxjs';
import type { ILogger } from '@schablone/logging';
import type { ILoggerService, ISceneService, ObjectSetupModel } from '../../types';
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
  private readonly logger: ILogger;
  private objects$: BehaviorSubject<Object3D[]>;

  public constructor(@inject(LoggerServiceToken) logger: ILoggerService) {
    this.logger = logger.withOptions({ globalLogOptions: { tags: { Service: 'Scene' } } });
    this.scene = new Scene();
    this.group = new Group();
    this.group.name = 'objects';
    this.scene.add(this.group);
    this.objects$ = new BehaviorSubject<Object3D[]>(this.group.children);
  }

  public addObjectToScene(object: Object3D, objectSetup?: ObjectSetupModel): void {
    if (objectSetup) {
      this.applyObjectSetup(object, objectSetup);
    }
    this.group.add(object);
    this.logger.debug('Object added', { objects: object });
    this.objects$.next(this.group.children);
  }

  public getObjects(): Observable<Object3D[]> {
    return this.objects$.asObservable();
  }

  public removeObjectFromScene(objectName: string): void {
    if (!this.group) {
      return;
    }
    let remove: Object3D | undefined;
    this.group.traverse((object) => {
      if (object.name === objectName && object.parent) {
        remove = object;
      }
    });
    if (remove && remove.parent) {
      remove.parent.remove(remove);
      this.objects$.next(this.group.children);
    }
  }

  private applyObjectSetup(object: Object3D, objectSetup: ObjectSetupModel): void {
    if (objectSetup.castShadow || objectSetup.receiveShadow) {
      object.traverse((child) => {
        if (child instanceof Mesh) {
          child.castShadow = objectSetup?.castShadow ?? false;
          child.receiveShadow = objectSetup?.receiveShadow ?? false;
        }
      });
    }
    if (objectSetup.name) {
      object.name = objectSetup.name;
    }
    if (objectSetup.receiveShadow) {
      object.receiveShadow = objectSetup.receiveShadow;
    }
    if (objectSetup.scale) {
      object.scale.setScalar(objectSetup.scale);
    }
  }
}
