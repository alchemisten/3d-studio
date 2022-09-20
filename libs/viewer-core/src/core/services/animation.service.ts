import { inject, injectable } from 'inversify';
import { AnimationAction, AnimationClip, AnimationMixer, Clock, Object3D } from 'three';
import { BehaviorSubject, Observable } from 'rxjs';
import type { AnimationIdModel, IAnimationService, IRenderService } from '../../types';
import { MissingAnimationError, MissingMixerError, ObjectHasNoAnimationsError } from '../exceptions';
import { RenderServiceToken } from '../../util';

/**
 * The animation service handles animations for all objects loaded in the
 * viewer. It provides access to the animations and object mixers for each
 * object and keeps track of the animation clock. To play any animations for an
 * object, a mixer has to be registered for it with animation service.
 *
 * Currently running animations are updated before each render call
 * automatically.
 */
@injectable()
export class AnimationService implements IAnimationService {
  private activeActions: AnimationAction[];
  private readonly animations: Record<string, AnimationClip[]>;
  private readonly activeActions$: BehaviorSubject<AnimationAction[]>;
  private animationPlaying!: boolean;
  private readonly clock: Clock;
  private readonly mixers: Record<string, AnimationMixer>;
  private readonly mixers$: BehaviorSubject<Record<string, AnimationMixer>>;

  public constructor(@inject(RenderServiceToken) private renderService: IRenderService) {
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
  }

  public addMixerForObject(object: Object3D): boolean {
    if (!object.name || !object.animations || object.animations.length < 1) {
      return false;
    }

    if (!this.mixers[object.name]) {
      this.mixers[object.name] = new AnimationMixer(object);
      console.log(object);
      this.animations[object.name] = object.animations;
    }

    this.mixers$.next(this.mixers);
    return true;
  }

  public getActiveAnimations(): Observable<AnimationAction[]> {
    return this.activeActions$.asObservable();
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

  public playObjectAnimation(animId: AnimationIdModel): void {
    try {
      const animation = this.getAnimation(animId);
      const mixer = this.getMixerForObject(animId.objectName);

      this.setAnimationEnabled(false);
      this.activeActions = [];
      this.activeActions.push(mixer.clipAction(animation));
      this.activeActions$.next(this.activeActions);
      this.setAnimationEnabled(true);
    } catch (exception) {
      console.warn(exception);
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
