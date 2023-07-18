import { inject, injectable } from 'inversify';
import type { Light } from 'three';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import type { ILogger } from '@schablone/logging';
import type { ILightService, ILoggerService } from '../../../types';
import type { ILightScenarioFeature, LightScenarioFeatureConfig, LightScenarioId, LightScenarioModel } from './types';
import { LightService, MissingLightScenarioError } from '../../../core';
import { LightScenarioFeatureToken, LightServiceToken, LoggerServiceToken } from '../../../util';

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
  private readonly enabled$: BehaviorSubject<boolean>;
  private lightScenarios!: LightScenarioModel[];
  private readonly logger: ILogger;

  public constructor(
    @inject(LightServiceToken) private lightService: ILightService,
    @inject(LoggerServiceToken) logger: ILoggerService
  ) {
    this.logger = logger.withOptions({ globalLogOptions: { tags: { Feature: 'LightScenario' } } });
    this.activeScenario$ = new Subject<LightScenarioModel>();
    this.enabled$ = new BehaviorSubject<boolean>(false);
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

        this.lightScenarios = this.transformLightSetups(config.scenarios);
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
    this.logger.debug('Set active light scenario', { objects: [this.activeScenario] });
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

  private transformLightSetups(scenarios: LightScenarioModel[]): LightScenarioModel[] {
    return scenarios.reduce((all, scenario) => {
      const newScenario = { ...scenario };
      if (scenario.lightSetups) {
        scenario.lightSetups.forEach((setup) => {
          try {
            scenario.lights[setup.name] = LightService.transformLightSetup(setup);
          } catch (error) {
            this.logger.warn(`Couldn't transform light setup`, { error: error });
            this.logger.debug('Light setup', { objects: [setup] });
          }
        });
        delete newScenario.lightSetups;
      }
      all.push(newScenario);
      return all;
    }, [] as LightScenarioModel[]);
  }
}
