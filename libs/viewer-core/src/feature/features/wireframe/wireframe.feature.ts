import { inject, injectable } from 'inversify';
import { Material, MeshStandardMaterial } from 'three';
import { BehaviorSubject, Observable } from 'rxjs';

import type { FeatureConfig, IMaterialService } from '../../../types';
import type { IWireframeFeature } from './types';
import { MaterialServiceToken, WireframeFeatureToken } from '../../../util';

/**
 * When enabled all materials of all objects in the scene will be set to
 * display as wireframe.
 */
@injectable()
export class WireframeFeature implements IWireframeFeature {
  public readonly id = WireframeFeatureToken;
  private enabled!: boolean;
  private readonly enabled$: BehaviorSubject<boolean>;
  private materials!: Material[];

  public constructor(@inject(MaterialServiceToken) private materialService: IMaterialService) {
    this.enabled$ = new BehaviorSubject<boolean>(false);
  }

  public getEnabled(): Observable<boolean> {
    return this.enabled$.asObservable();
  }

  public init(config: FeatureConfig) {
    this.enabled = config.enabled;
    this.enabled$.next(this.enabled);
    this.materialService.getMaterials().subscribe((materials) => {
      this.materials = materials;
      this.setWireframeEnabled(this.enabled);
    });
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.enabled$.next(this.enabled);
    this.setWireframeEnabled(this.enabled);
  }

  private setWireframeEnabled(enabled: boolean): void {
    this.materials.forEach((material) => {
      if ((material as MeshStandardMaterial).wireframe !== undefined) {
        (material as MeshStandardMaterial).wireframe = enabled;
        material.needsUpdate = true;
      }
    });
  }
}
