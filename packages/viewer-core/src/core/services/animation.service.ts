import { AnimationAction, AnimationClip, AnimationMixer, Clock, Object3D } from 'three';
import { BehaviorSubject, Observable } from 'rxjs';
import { provideSingleton } from 'util/inversify';
import { AnimationIdModel, IAnimationService } from '../../types';
import { RenderService } from './render.service';



@provideSingleton(AnimationService)
export class AnimationService implements IAnimationService {
    private activeActions: AnimationAction[];
    private animations: Record<string, AnimationClip[]>;
    private readonly activeActions$: BehaviorSubject<AnimationAction[]>;
    private animationPlaying: boolean;
    private readonly clock: Clock;
    private readonly mixers: Record<string, AnimationMixer>;
    private readonly mixers$: BehaviorSubject<Record<string, AnimationMixer>>;

    constructor(
        private renderService: RenderService
    ) {
        this.animations = {};
        this.activeActions = [];
        this.activeActions$ = new BehaviorSubject<AnimationAction[]>(this.activeActions);
        this.clock = new Clock();
        this.mixers = {};
        this.mixers$ = new BehaviorSubject<Record<string, AnimationMixer>>(this.mixers);
        this.renderService.hookBeforeRender$.subscribe(() => {
            const delta = this.clock.getDelta();
            for (let key in this.mixers) {
                if (Object.prototype.hasOwnProperty.call(this.mixers, key)) {
                    this.mixers[key].update(delta);
                }
            }
        });
    }



    addMixerForObject(object: Object3D): boolean {
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


    getActiveAnimations(): Observable<AnimationAction[]> {
        return this.activeActions$.asObservable();
    }


    getMixerForObject(objectName: string): AnimationMixer | null {
        return this.mixers[objectName] || null;
    }


    getMixers(): Observable<Record<string, AnimationMixer>> {
        return this.mixers$.asObservable();
    }


    playObjectAnimation(animId: AnimationIdModel): boolean {
        const  animation = this.getAnimation(animId);
        if (animation && this.mixers[animId.objectName]) {
            this.animationToggle(false);
            this.activeActions = [];
            this.activeActions.push(this.mixers[animId.objectName].clipAction(animation));
            this.activeActions$.next(this.activeActions);
            this.animationToggle(true);

            return true;
        }

        return false;
    }


    setAnimationEnabled(enabled: boolean): void {
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


    setAnimationTime(time: number): void {
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


    private animationToggle(play: boolean): void {
        this.animationPlaying = play;
        let aLength = this.activeActions.length;

        for (let i = 0; i < aLength; i++) {
            if (play) {
                this.activeActions[i].play();
                this.activeActions[i].paused = false;
            } else {
                this.activeActions[i].paused = true;
            }
        }
    }


    private getAnimation(animId: AnimationIdModel): AnimationClip | null {
        if (this.animations[animId.objectName]) {
            const aLength = this.animations[animId.objectName].length;
            for (let i = 0; i < aLength; i++) {
                if (this.animations[animId.objectName][i].name === animId.animationName) {
                    return this.animations[animId.objectName][i];
                }
            }
        }

        return null;
    }
}