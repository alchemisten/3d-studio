import { inject, injectable } from 'inversify';
import { Light } from 'three';
import { Observable, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import {
  ILightScenarioFeature,
  ILightService,
  LightScenarioFeatureConfig,
  LightScenarioFeatureToken,
  LightScenarioId,
  LightScenarioModel,
  LightServiceToken,
} from '../../types';
import { LightService } from '../../core/services';
import { MissingLightScenarioError } from '../../core/exceptions';

/**
 * When enabled, allows to switch between the provided light scenarios. Each
 * light scenario can contain a number of lights or light setups, which will be
 * automatically transformed into lights via the LightService. Light setups do
 * not support all light types or features, so providing actual lights should
 * be preferred. When providing light setups for a scenario, lights should be
 * set to an empty array in the config.
 */
@injectable()
export class LightScenarioFeature implements ILightScenarioFeature {
  public readonly id = LightScenarioFeatureToken;
  private readonly activeScenario$: Subject<LightScenarioModel>;
  private activeScenario!: LightScenarioModel;
  private defaultScenario!: LightScenarioModel;
  private enabled!: boolean;
  private readonly enabled$: Subject<boolean>;
  private lightScenarios!: LightScenarioModel[];

  public constructor(@inject(LightServiceToken) private lightService: ILightService) {
    this.activeScenario$ = new Subject<LightScenarioModel>();
    this.enabled$ = new Subject<boolean>();
  }

  public getActiveScenario(): Observable<LightScenarioModel> {
    return this.activeScenario$.asObservable();
  }

  public getEnabled(): Observable<boolean> {
    return this.enabled$.asObservable();
  }

  public getLightScenarios(): LightScenarioModel[] {
    return this.lightScenarios;
  }

  public init(config: LightScenarioFeatureConfig): void {
    this.enabled = config.enabled;
    this.enabled$.next(this.enabled);

    this.lightService
      .getLights()
      .pipe(take(1))
      .subscribe((lights: Record<string, Light>) => {
        this.defaultScenario = {
          i18n: {
            de: {
              name: 'Studio Default',
            },
          },
          id: 'studio-default',
          lights,
        };
        if (config.makeStudioDefaultSelectable) {
          this.lightScenarios.push(this.defaultScenario);
        }

        this.lightScenarios = LightScenarioFeature.transformLightSetups(config.scenarios);
        if (this.enabled) {
          this.setActiveScenario(config.initialScenarioId);
        }
      });
  }

  public setActiveScenario(id: LightScenarioId): void {
    const newScenario = this.lightScenarios.find((scenario) => scenario.id === id);
    if (!newScenario) {
      throw new MissingLightScenarioError(
        `Can't set active light scenario. Light scenario with ID ${id} does not exist`
      );
    }

    this.activeScenario = newScenario;
    this.lightService.removeLights();
    this.lightService.addLights(this.activeScenario.lights);
    this.activeScenario$.next(this.activeScenario);
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.enabled$.next(this.enabled);

    if (this.enabled) {
      this.setActiveScenario(this.activeScenario.id);
    } else {
      this.lightService.removeLights();
      this.lightService.addLights(this.defaultScenario.lights);
    }
  }

  private static transformLightSetups(scenarios: LightScenarioModel[]): LightScenarioModel[] {
    return scenarios.reduce((all, scenario) => {
      const newScenario = { ...scenario };
      if (scenario.lightSetups) {
        scenario.lightSetups.forEach((setup) => {
          try {
            scenario.lights[setup.name] = LightService.transformLightSetup(setup);
          } catch (error) {
            console.warn(error);
          }
        });
        delete newScenario.lightSetups;
      }
      all.push(newScenario);
      return all;
    }, [] as LightScenarioModel[]);
  }
}
