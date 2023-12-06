import { inject, injectable } from 'inversify';
import { AnimationAction, AnimationClip, AnimationMixer, Clock, Object3D } from 'three';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ILogger } from '@schablone/logging';
import type {
  AnimationIdModel,
  AnimationTimeMap,
  IAnimationService,
  ILoggerService,
  IRenderService,
  ISceneService,
} from '../../types';
import { MissingAnimationError, MissingMixerError, ObjectHasNoAnimationsError } from '../exceptions';
import { LoggerServiceToken, RenderServiceToken, SceneServiceToken } from '../../util';

@injectable()
export class AnimationService implements IAnimationService {
  private activeActions: AnimationAction[];
  private readonly animations: Record<string, AnimationClip[]>;
  private readonly activeActions$: BehaviorSubject<AnimationAction[]>;
  private animationPlaying!: boolean;
  private readonly clock: Clock;
  private readonly logger: ILogger;
  private readonly mixers: Record<string, AnimationMixer>;
  private readonly mixers$: BehaviorSubject<Record<string, AnimationMixer>>;

  public constructor(
    @inject(LoggerServiceToken) logger: ILoggerService,
    @inject(RenderServiceToken) private renderService: IRenderService,
    @inject(SceneServiceToken) private sceneService: ISceneService
  ) {
    this.logger = logger.withOptions({ globalLogOptions: { tags: { Service: 'Animation' } } });
    this.animations = {};
    this.activeActions = [];
    this.activeActions$ = new BehaviorSubject<AnimationAction[]>(this.activeActions);
    this.clock = new Clock();
    this.mixers = {};
    this.mixers$ = new BehaviorSubject<Record<string, AnimationMixer>>(this.mixers);
    this.renderService.hookBeforeRender$.subscribe(() => {
      const delta = this.clock.getDelta();
      for (const key in this.mixers) {
        if (Object.prototype.hasOwnProperty.call(this.mixers, key)) {
          this.mixers[key].update(delta);
        }
      }
    });
    this.sceneService.objectAddedToScene$.subscribe((object) => {
      this.addMixerForObject(object);
    });
  }

  public addMixerForObject(object: Object3D): AnimationMixer | false {
    if (!object.name || !object.animations || object.animations.length < 1) {
      return false;
    }

    if (!this.mixers[object.name]) {
      this.mixers[object.name] = new AnimationMixer(object);
      this.logger.debug('Created mixer for', { objects: object });
      this.animations[object.name] = object.animations;
    }

    this.mixers$.next(this.mixers);
    return this.mixers[object.name];
  }

  public getActiveAnimations(): Observable<AnimationAction[]> {
    return this.activeActions$.asObservable();
  }

  public getActiveAnimationTime(): Observable<AnimationTimeMap> {
    return this.renderService.hookBeforeRender$.pipe(
      map(() =>
        this.activeActions.reduce((acc, action) => {
          acc[action.getClip().name] = {
            duration: action.getClip().duration,
            time: action.time,
          };
          return acc;
        }, {} as AnimationTimeMap)
      )
    );
  }

  public getMixerForObject(objectName: string): AnimationMixer {
    if (!this.mixers[objectName]) {
      throw new MissingMixerError(`No mixer available for object ${objectName}`);
    }

    return this.mixers[objectName];
  }

  public getMixers(): Observable<Record<string, AnimationMixer>> {
    return this.mixers$.asObservable();
  }

  public playObjectAnimation(animId: AnimationIdModel): AnimationAction | false {
    try {
      const animation = this.getAnimation(animId);
      const mixer = this.getMixerForObject(animId.objectName);

      this.setAnimationEnabled(false);
      this.activeActions = [];
      const action = mixer.clipAction(animation);
      this.activeActions.push(action);
      this.activeActions$.next(this.activeActions);
      this.setAnimationEnabled(true);
      return action;
    } catch (error) {
      this.logger.warn(`Can't play animation ${animId}`, { error });
      return false;
    }
  }

  public setAnimationEnabled(enabled: boolean): void {
    this.animationPlaying = enabled;
    const aLength = this.activeActions.length;

    for (let i = 0; i < aLength; i++) {
      if (enabled) {
        this.activeActions[i].play();
        this.activeActions[i].paused = false;
      } else {
        this.activeActions[i].paused = true;
      }
    }
  }

  public setAnimationTime(time: number): void {
    const aLength = this.activeActions.length;
    for (let i = 0; i < aLength; i++) {
      const action = this.activeActions[i];
      const clip = action.getClip();
      if (time >= 0 && time <= clip.duration) {
        action.time = time;

        // If animation has never been started, start and pause it
        if (!action.isRunning() && !action.paused) {
          action.play();
          action.paused = true;
        }
      }
    }
  }

  private getAnimation(animId: AnimationIdModel): AnimationClip {
    if (!this.animations[animId.objectName]) {
      throw new ObjectHasNoAnimationsError(`Object ${animId.objectName} doesn't have any animations`);
    }

    const aLength = this.animations[animId.objectName].length;
    for (let i = 0; i < aLength; i++) {
      if (this.animations[animId.objectName][i].name === animId.animationName) {
        return this.animations[animId.objectName][i];
      }
    }

    throw new MissingAnimationError(`Animation ${animId.animationName} doesn't exist on object ${animId.objectName}`);
  }
}
