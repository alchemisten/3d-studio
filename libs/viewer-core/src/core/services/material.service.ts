import { inject, injectable } from 'inversify';
import { Material, Mesh } from 'three';
import { BehaviorSubject, Observable } from 'rxjs';
import type { ILogger } from '@schablone/logging';
import type { ILoggerService, IMaterialService, ISceneService } from '../../types';
import { LoggerServiceToken, SceneServiceToken } from '../../util';

/**
 * The material service keeps a record of all materials available in the
 * viewer. Whenever an object is loaded, the materials are automatically
 * extracted and tracked in the service. Additional materials can be added
 * manually.
 * Materials are tracked by their name. If multiple objects have a material
 * with the same name, the material of the first object will be assigned to
 * all other objects.
 *
 * The service allows to the change properties of tracked materials.
 *
 * TODO: Implement changing assigned materials on objects
 */
@injectable()
export class MaterialService implements IMaterialService {
  private assignedMaterials$: BehaviorSubject<Record<string, Material>>;
  private readonly logger: ILogger;
  private materials: Material[];
  private readonly materials$: BehaviorSubject<Material[]>;

  public constructor(
    @inject(LoggerServiceToken) logger: ILoggerService,
    @inject(SceneServiceToken) private sceneService: ISceneService
  ) {
    this.logger = logger.withOptions({ globalLogOptions: { tags: { Service: 'Material' } } });
    this.assignedMaterials$ = new BehaviorSubject<Record<string, Material>>({});
    this.materials = [];
    this.materials$ = new BehaviorSubject<Material[]>(this.materials);

    this.sceneService.getObjects().subscribe((objects) => {
      objects.forEach((object) => {
        object.traverse((node: unknown) => {
          if ((node as Mesh).isMesh) {
            this.handleMeshMaterial(node as Mesh, (material: Material) => {
              if (material.name) {
                const existingMaterial = this.materials.find((sMaterial) => sMaterial.name === material.name);
                if (!existingMaterial) {
                  this.materials = this.materials.concat(material);
                } else {
                  (node as Mesh).material = existingMaterial;
                }
              } else {
                this.logger.debug('Material has no name', { objects: [node, material] });
              }
            });
          }
        });
      });
      this.logger.debug('Updated materials', { objects: this.materials });
      this.materials$.next(this.materials);
    });
  }

  public addMaterial(material: Material): void {
    if (this.materials.findIndex((sMaterial) => sMaterial.name === material.name) === -1) {
      this.materials.push(material);
      this.materials$.next(this.materials);
    }
  }

  public getAssignedMaterials(): Observable<Record<string, Material>> {
    return this.assignedMaterials$.asObservable();
  }

  public getMaterials(): Observable<Material[]> {
    return this.materials$.asObservable();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public setAssignedMaterial(materialSlot: string, material: Material): void {
    // TODO: Implement me
  }

  public setMaterialProperties(materials: Record<string, Partial<Material>>): void {
    this.materials = this.materials.reduce((all: Material[], material: Material) => {
      if (materials[material.name]) {
        all.push(Object.assign(material, materials[material.name], { needsUpdate: true }));
      } else {
        all.push(material);
      }
      return all;
    }, []);
    this.materials$.next(this.materials);
  }

  private handleMeshMaterial(mesh: Mesh, materialHandler: (material: Material) => void): void {
    const meshMaterials: Material[] = [];
    if (Array.isArray(mesh.material)) {
      meshMaterials.concat(mesh.material);
    } else {
      meshMaterials.push(mesh.material as Material);
    }
    meshMaterials.forEach((meshMaterial) => {
      materialHandler(meshMaterial);
    });
  }
}
