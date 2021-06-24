import {
    Material,
    Mesh,
} from 'three';
import { BehaviorSubject, Observable} from 'rxjs';
import { IMaterialService } from '../../types';
import { provideSingleton } from 'util/inversify';
import { SceneService } from './scene.service';



@provideSingleton(MaterialService)
export class MaterialService implements IMaterialService {
    private assignedMaterials$: BehaviorSubject<Record<string, Material>>;
    private materials: Material[];
    private readonly materials$: BehaviorSubject<Material[]>;

    constructor(
        private sceneService: SceneService
    ) {
        this.assignedMaterials$ = new BehaviorSubject<Record<string, Material>>({});
        this.materials = [];
        this.materials$ = new BehaviorSubject<Material[]>(this.materials);

        const scope = this;
        this.sceneService.getObjects().subscribe(objects => {
            objects.forEach(object => {
                object.traverse(function (node: Mesh) {
                    if (node.isMesh) {
                        scope.handleMeshMaterial(node, (material: Material) => {
                            if (material.name) {
                                const existingMaterial = scope.materials.find((sMaterial) => sMaterial.name === material.name);
                                if (!existingMaterial) {
                                    scope.materials = scope.materials.concat(material);
                                } else {
                                    node.material = existingMaterial;
                                }
                            }
                        });
                    }
                });
            });
            scope.materials$.next(scope.materials);
        });
    }



    addMaterial(material: Material): void {
        if (this.materials.findIndex((sMaterial) => sMaterial.name === material.name) === -1) {
            this.materials.push(material);
            this.materials$.next(this.materials);
        }
    }


    getAssignedMaterials(): Observable<Record<string, Material>> {
        return this.assignedMaterials$.asObservable();
    }


    getMaterials(): Observable<Material[]> {
        return this.materials$.asObservable();
    }


    setAssignedMaterial(materialSlot: string, material: Material): void {}


    setMaterialProperties(materials: Record<string, Partial<Material>>): void {
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
        const meshMaterials: Material[] = new Array().concat(mesh.material);
        meshMaterials.forEach((meshMaterial) => {
            materialHandler(meshMaterial);
        });
    }
}