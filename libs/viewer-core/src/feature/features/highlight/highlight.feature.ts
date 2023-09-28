import { inject, injectable } from 'inversify';
import { Group, Intersection, Mesh, PerspectiveCamera, Raycaster, Sprite, Vector2, Vector3 } from 'three';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { withLatestFrom } from 'rxjs/operators';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ILogger } from '@schablone/logging';

import {
  AssetServiceToken,
  ControlServiceToken,
  HighlightFeatureToken,
  LoggerServiceToken,
  RenderServiceToken,
  SceneServiceToken,
} from '../../../util';
import type { IAssetService, IControlService, IRenderService, ISceneService } from '../../../types';
import {
  HighlightFeatureConfig,
  HighlightMode,
  HighlightModelId,
  HighlightSetupModel,
  HighlightTextureMap,
  IHighlightFeature,
} from './types';
import Highlight from './highlight';

@injectable()
export class HighlightFeature implements IHighlightFeature {
  public readonly id = HighlightFeatureToken;
  private assetPath!: string;
  private baseFov!: number;
  private camera!: PerspectiveCamera;
  private clickable: Sprite[] = [];
  private controls!: OrbitControls;
  private debugHighlight: Highlight | null = null;
  private dragThreshold = 0.01;
  private enabled!: boolean;
  private readonly enabled$!: BehaviorSubject<boolean>;
  private readonly EPS = 0.000001;
  private focusedHighlight$!: Subject<Highlight | null>;
  private FOVAnimateSpeed = 6;
  private fovTarget = 90;
  private highlights$!: BehaviorSubject<Highlight[]>;
  private highlights: Highlight[] = [];
  private highlightsVisible!: boolean;
  private readonly highlightGroup: Group = new Group();
  private inAnimateSpeed = 3;
  private inDelay = false;
  private lastFov = 90;
  private lastTime: number = Date.now();
  private readonly logger!: ILogger;
  private mouseWheelEventEnabled = false;
  private mouseWheelFired = false;
  private outAnimateSpeed = 6;
  private posTarget: Vector3 = new Vector3();
  private rayCaster: Raycaster = new Raycaster();
  private segueOnAnimation = true;
  private state: HighlightMode = HighlightMode.ORBIT;
  private startPos: Vector2 = new Vector2();
  private viewCurrent: Vector3 = new Vector3();
  private viewTarget: Vector3 = new Vector3();
  private visibility: Highlight[] = [];

  public constructor(
    @inject(AssetServiceToken) private assetService: IAssetService,
    @inject(ControlServiceToken) private controlService: IControlService,
    @inject(LoggerServiceToken) logger: ILogger,
    @inject(RenderServiceToken) private renderService: IRenderService,
    @inject(SceneServiceToken) private sceneService: ISceneService
  ) {
    this.logger = logger.withOptions({ globalLogOptions: { tags: { Feature: 'Highlight' } } });
    if (!document || !window) {
      this.logger.warn('Highlight feature only available in browser environment');
      return;
    }

    this.enabled$ = new BehaviorSubject<boolean>(false);
    this.focusedHighlight$ = new Subject<Highlight | null>();
    this.highlights$ = new BehaviorSubject<Highlight[]>(this.highlights);
    this.controlService.getControls().subscribe((controls) => {
      this.controls = controls;
    });
    this.renderService.getCamera().subscribe((camera) => {
      this.camera = camera;
      this.baseFov = this.camera.fov;
    });
    this.highlightGroup.name = 'highlights';
  }

  public init(config: HighlightFeatureConfig) {
    this.logger.debug('Initializing with config', { objects: config });
    this.enabled = config.enabled;
    this.assetPath = config.assetPath ?? 'assets/textures/highlights/';
    this.highlightsVisible = config.highlightsVisible ?? true;
    if (config.groupScale) {
      this.highlightGroup.scale.setScalar(config.groupScale);
    }
    this.loadHighlightTextures().then((textures) => {
      this.createHighlights(config.highlightSetup, textures);
      this.highlights$.next(this.highlights);
    });
    this.renderService.hookAfterRender$.pipe(withLatestFrom(this.getEnabled())).subscribe(([, enabled]) => {
      if (enabled) {
        this.update();
      }
    });
    document.addEventListener('touchstart', (event) => {
      if (event.touches && event.touches.length > 0) {
        this.onDocumentMouseDown(event);
      }
    });
    document.addEventListener('mousedown', this.onDocumentMouseDown.bind(this), false);

    if (this.enabled) {
      this.sceneService.addObjectToScene(this.highlightGroup);
      document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this), false);
    }

    this.enabled$.next(this.enabled);
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      this.sceneService.addObjectToScene(this.highlightGroup);
      document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this), false);
    } else {
      this.sceneService.removeObjectFromScene('highlights');
      document.removeEventListener('mousemove', this.onDocumentMouseMove);
    }
    this.enabled$.next(this.enabled);
  }

  public focusHighlight(id: HighlightModelId): void {
    const highlight = this.highlights.find((h) => h.id === id);
    if (highlight) {
      this.dispatchHighlightClick(highlight);
    } else {
      this.logger.warn(`Couldn't focus highlight with id ${id}.`);
    }
  }

  public getEnabled(): Observable<boolean> {
    return this.enabled$.asObservable();
  }

  public getFocusedHighlight(): Observable<Highlight | null> {
    return this.focusedHighlight$.asObservable();
  }

  public getHighlights(): Observable<Highlight[]> {
    return this.highlights$.asObservable();
  }

  private addListeners(key: string) {
    switch (key) {
      case 'start':
        this.controls.domElement.addEventListener('mousedown', this.onMouseStart, false);
        this.controls.domElement.addEventListener('touchstart', this.onTouchStart, false);
        break;
      case 'move':
        this.controls.domElement.addEventListener('touchmove', this.onTouchMove, false);
        this.controls.domElement.addEventListener('mousemove', this.onMouseMove, false);
        break;
      case 'end':
        this.controls.domElement.addEventListener('touchend', this.onTouchEnd, false);
        this.controls.domElement.addEventListener('mouseup', this.onMouseEnd, false);
        break;
      case 'wheel':
        this.controls.domElement.addEventListener('wheel', this.onMouseWheel, false);
        this.mouseWheelFired = false;
        this.mouseWheelEventEnabled = true;
        break;
      default:
        break;
    }
  }

  private checkHighLightClickIntersect(event: MouseEvent | Touch): void {
    const intersects = this.checkIntersect(event);

    if (intersects.length > 0 && this.highlightsVisible) {
      // if (this._config.tech.debug) console.log('DEBUG ==== Intersect!'); // TODO verbosity

      const cLength = this.clickable.length;
      for (let i = 0; i < cLength; i++) {
        // if (this._config.tech.debug) console.log('DEBUG ===== Intersect: ' + intersects[0].object.id + ' vs. ' + this.clickable[i].id); // TODO verbosity
        if (intersects[0].object.id === this.clickable[i].id) {
          this.dispatchHighlightClick(this.highlights[i]);
          break;
        }
      }
    }
  }

  private checkHighlightIntersect(event: MouseEvent): void {
    if (this.highlightsVisible) {
      const intersects = this.checkIntersect(event);
      const hits: Record<string, boolean> = {};
      if (intersects.length > 0) {
        for (let j = 0; j < intersects.length; j++) {
          hits[intersects[j].object.id] = true;
        }
      }

      for (let i = 0; i < this.clickable.length; i++) {
        this.highlights[i].setHover(hits[this.clickable[i].id]);
      }
    }
  }

  private checkIntersect(event: MouseEvent | Touch): Intersection[] {
    const vector = new Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    this.rayCaster.setFromCamera(vector, this.camera);

    return this.rayCaster.intersectObjects(this.clickable);
  }

  private clamp(val: number, min: number, max: number): number {
    return val >= min && val <= max ? val : val > max ? max : min;
  }

  private createHighlights(setups: HighlightSetupModel[], textures: HighlightTextureMap) {
    setups.forEach((setup) => {
      if (this.getHighlightByID(setup.id)) {
        return;
      }

      const highlight = new Highlight(setup, this.logger, this.highlightGroup, textures);
      this.highlights.push(highlight);

      // // animation hooks
      // if (hl.animation && !hl.isTrigger) {
      //   this.animMan.addTimelineHook("highlight", hl.animation.targetTime, hl.animation.timeUnit, hl);
      // }

      // visibility
      if (highlight.visibility) {
        this.visibility.push(highlight);
      }
      this.clickable.push(highlight.glow);
    });
    this.setClickzonesVisible(this.highlightsVisible);
  }

  private dispatchHighlightClick(hl: Highlight, immediate = false, fromStart = false) {
    // TODO: Highlight animations not yet implemented in AnimationsManager
    // check if highlight is trigger
    // if (hl.isTrigger || (hl.animation && hl.animation.targetTime && immediate)) {
    //   if (hl.animation) {
    //     if (!immediate) {
    //       //console.log(hl.animation.targetTime,this.animMan.currentAnimationTime);
    //       this.animMan.animateTo({
    //         time: hl.animation.targetTime,
    //         unit: hl.animation.timeUnit,
    //         teleport: hl.animation.teleport || fromStart || hl.animation.targetTime < this.animMan.currentAnimationTime
    //       }, (data) => {
    //         console.log("Stopped Animation At", data);
    //       });
    //     } else {
    //       this.animMan.animateTo({
    //         time: hl.animation.targetTime,
    //         unit: hl.animation.timeUnit,
    //         teleport: true
    //       }, (data) => {
    //         this.logger.debug("Stopped Animation At", { objects: data });
    //       });
    //       this.setPOI(hl);
    //       // this.dispatcher.dispatch('highlightClicked', { hl });
    //     }
    //
    //   }
    // this.dispatcher.dispatch('highlightClicked', { hl });
    // } else {
    this.setPOI(hl);
    // this.dispatcher.dispatch('highlightClicked', { hl });
    // }
  }

  private getDirection(obj: MouseEvent | Touch, prefix: string): Vector2 {
    const { innerHeight, innerWidth } = window;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return new Vector2(obj[`${prefix}X`] / innerWidth, obj[`${prefix}Y`] / innerHeight);
  }

  private getHighlightByID(id: string): Highlight | false {
    return this.highlights.find((h) => h.id === id) || false;
  }

  private handleEnd = (): void => {
    this.removeListeners('end');
    this.removeListeners('move');
    this.addListeners('start');
  };

  private handleMove = (newPos: Vector2): void => {
    if (this.startPos.distanceTo(newPos) > this.dragThreshold && this.state !== HighlightMode.TO_ORBIT) {
      this.state = HighlightMode.TO_ORBIT;
      this.focusedHighlight$.next(null);
      // this.dispatcher.dispatch("onstate", this.state);
      this.addListeners('wheel');
      this.controls.position0 = this.camera.position.clone();
      this.controls.target0 = this.viewCurrent.clone();
      this.controls.target = this.viewCurrent.clone();
      this.controls.reset();
      this.controls.enabled = true;
      // if (this.animMan.animationPlaying) {
      //   this.mediator.dispatch("toggleState", { key: 'animatedHighlights', value: false });
      // }
    }
  };

  private handleStart = (pos: Vector2): void => {
    this.startPos = pos;
    this.removeListeners('start');
    this.addListeners('move');
    this.addListeners('end');
  };

  private handleWheel = () => {
    this.mouseWheelFired = true;
  };

  private hoverHighlight(id: string, active: boolean): void {
    // TODO: Postprocessing not yet implemented
    // if (this._config.features.usePostProcessing.active
    //   && this.renderMan.postprocesses.edgeglow !== undefined
    //   && this.renderMan.postprocesses.edgeglow.enabled){
    //   if (!active){
    //     // console.log('End hover');  // TODO verbosity
    //     this.renderMan.postprocesses.edgeglow.selectedObjects = [];
    //   } else {
    //     let hl = this.getHighlightByID(id);
    //     if (hl !== false){
    //       // console.log('Hover highlight: '+hl.headline);  // TODO verbosity
    //       this.renderMan.postprocesses.edgeglow.selectedObjects = hl.nodes;
    //     }
    //   }
    // }
  }

  private interpolateTo(current: number, target: number, deltaTime: number, speed: number): number {
    if (speed <= 0) {
      return target;
    }

    const dist = target - current;
    if (dist * dist < this.EPS) return target;

    const deltaMove = dist * this.clamp((deltaTime / 1000) * speed, 0, 1);
    return current + deltaMove;
  }

  private loadHighlightTextures(): Promise<HighlightTextureMap> {
    const textures: HighlightTextureMap = {
      actionTransTex: null,
      actionTransHoverTex: null,
      simpleTransTex: null,
      simpleTransHoverTex: null,
    };
    return Promise.all(
      Object.entries({
        actionTransTex: `${this.assetPath}action_trans.png`,
        actionTransHoverTex: `${this.assetPath}action_trans_hover.png`,
        simpleTransTex: `${this.assetPath}simple_trans.png`,
        simpleTransHoverTex: `${this.assetPath}simple_trans_hover.png`,
      }).map(([key, value]) =>
        this.assetService.loadTexture(value).then((texture) => {
          textures[key] = texture;
        })
      )
    ).then(() => {
      this.logger.debug('All highlight textures loaded', { objects: textures });
      return textures;
    });
  }

  private onDocumentMouseDown(event: Event): void {
    this.checkHighLightClickIntersect(event as MouseEvent);
  }

  private onDocumentMouseMove(event: Event): void {
    this.checkHighlightIntersect(event as MouseEvent);
  }

  private onMouseEnd = (): void => {
    this.handleEnd();
  };

  private onMouseMove = (event: Event): void => {
    this.handleMove(this.getDirection(event as MouseEvent, 'client'));
  };

  private onMouseStart = (event: Event): void => {
    this.handleStart(this.getDirection(event as MouseEvent, 'client'));
  };

  private onMouseWheel = (): void => {
    this.handleWheel();
  };

  private onTouchEnd = () => {
    this.handleEnd();
  };

  private onTouchMove = (event: Event): void => {
    this.handleMove(this.getDirection((event as TouchEvent).touches[0], 'page'));
  };

  private onTouchStart = (event: Event): void => {
    switch ((event as TouchEvent).touches.length) {
      case 1:
        this.handleStart(this.getDirection((event as TouchEvent).touches[0], 'page'));
        break;
      case 2:
        if (this.mouseWheelEventEnabled) {
          this.mouseWheelFired = true;
        }
        break;
      default:
        break;
    }
  };

  private removeListeners(key?: string) {
    switch (key) {
      case 'start':
        this.controls.domElement.removeEventListener('touchstart', this.onTouchStart, false);
        this.controls.domElement.removeEventListener('mousedown', this.onMouseStart, false);
        break;
      case 'move':
        this.controls.domElement.removeEventListener('touchmove', this.onTouchMove, false);
        this.controls.domElement.removeEventListener('mousemove', this.onMouseMove, false);
        break;
      case 'end':
        this.controls.domElement.removeEventListener('touchend', this.onTouchEnd, false);
        this.controls.domElement.removeEventListener('mouseup', this.onMouseEnd, false);
        break;
      case 'wheel':
        this.controls.domElement.removeEventListener('wheel', this.onMouseWheel, false);
        this.mouseWheelEventEnabled = false;
        break;
      default:
        this.controls.domElement.removeEventListener('touchstart', this.onTouchStart, false);
        this.controls.domElement.removeEventListener('mousedown', this.onMouseStart, false);
        this.controls.domElement.removeEventListener('touchmove', this.onTouchMove, false);
        this.controls.domElement.removeEventListener('mousemove', this.onMouseMove, false);
        this.controls.domElement.removeEventListener('touchend', this.onTouchEnd, false);
        this.controls.domElement.removeEventListener('mouseup', this.onMouseEnd, false);
        this.controls.domElement.removeEventListener('wheel', this.onMouseWheel, false);
        this.mouseWheelEventEnabled = false;
        break;
    }
  }

  private setClickzonesVisible(value?: boolean): void {
    this.highlightsVisible = value ?? !this.highlightsVisible;
    this.highlights.forEach((highlight) => {
      highlight.clickzone.visible = this.highlightsVisible;
      highlight.glow.traverse((node) => {
        const materials = (node as Mesh).material;
        if (Array.isArray(materials)) {
          materials.forEach((material) => {
            material.opacity = this.highlightsVisible ? 1 : 0;
          });
        } else {
          materials.opacity = this.highlightsVisible ? 1 : 0;
        }
      });
    });
  }

  private setPOI(highlight: Highlight): void {
    this.logger.debug('Going to highlight', { objects: highlight.id });
    this.focusedHighlight$.next(highlight);

    this.state = HighlightMode.TO_HIGHLIGHT;
    // this.dispatcher.dispatch("onstate", scope.state);
    // TODO check if we are on Point
    this.controls.enabled = false;
    this.lastTime = Date.now();
    this.posTarget = highlight.getCameraTarget();
    this.viewTarget = highlight.getViewTarget();
    this.viewCurrent = new Vector3(0, 0, -1)
      .applyQuaternion(this.camera.quaternion)
      .multiplyScalar(10)
      .add(this.camera.position.clone());
    this.lastFov = this.camera.fov;
    this.fovTarget = highlight.getFov();
    this.inAnimateSpeed = highlight.speed.in;
    this.outAnimateSpeed = highlight.speed.out;
    this.FOVAnimateSpeed = highlight.speed.fov;
    this.addListeners('start');

    this.debugHighlight = highlight;
  }

  private update(): void {
    const currentTime = Date.now();
    const timeDelta = currentTime - this.lastTime;

    switch (this.state) {
      case HighlightMode.TO_HIGHLIGHT:
        // camera position
        this.v3interpolateTo(this.camera.position, this.posTarget, timeDelta, this.inAnimateSpeed);

        // camera view direction
        this.v3interpolateTo(this.viewCurrent, this.viewTarget, timeDelta, this.inAnimateSpeed);
        this.camera.lookAt(this.viewCurrent);

        // camera fov
        this.camera.fov = this.interpolateTo(this.camera.fov, this.fovTarget, timeDelta, this.inAnimateSpeed);
        this.camera.updateProjectionMatrix();
        if (
          this.camera.position.distanceTo(this.posTarget) < this.EPS &&
          this.viewCurrent.distanceTo(this.viewTarget) < this.EPS &&
          Math.abs(this.camera.fov - this.fovTarget) < this.EPS
        ) {
          this.state = HighlightMode.HIGHLIGHT;
          // this.dispatcher.dispatch("onstate", this.state);
        }
        break;
      case HighlightMode.TO_ORBIT: {
        // TODO change, if center is not rotationcenter! // orbitSize, if cameradistance is changing, change this too
        const orgTarget = new Vector3();
        const orbitSize = 6;

        // camera fov
        this.camera.fov = this.interpolateTo(this.camera.fov, this.baseFov, timeDelta, this.FOVAnimateSpeed);
        this.camera.updateProjectionMatrix();

        this.v3interpolateTo(this.controls.target, orgTarget, timeDelta, this.outAnimateSpeed);
        this.controls.target0.copy(this.controls.target);

        const orbitDist = this.camera.position.distanceTo(orgTarget);
        if (!this.mouseWheelFired && Math.abs(orbitDist - orbitSize) > this.EPS) {
          const amm = this.interpolateTo(orbitDist, orbitSize, timeDelta, this.FOVAnimateSpeed);
          const dir = this.camera.position
            .clone()
            .sub(orgTarget) //scope._controls.target
            .normalize()
            .multiplyScalar(amm);
          this.camera.position.copy(dir);
        }

        if (this.mouseWheelEventEnabled && this.mouseWheelFired) {
          this.removeListeners('wheel');
        }

        const targetDist = this.controls.target.distanceTo(orgTarget);
        if (
          Math.abs(orbitDist - orbitSize) < this.EPS &&
          targetDist < this.EPS &&
          Math.abs(this.camera.fov - this.baseFov) < this.EPS
        ) {
          this.state = HighlightMode.ORBIT;
          // this.dispatcher.dispatch("onstate", this.state);
          // this.renderMan.removeEdgeGlow();
          this.removeListeners();

          this.controls.target0.copy(orgTarget);
          this.controls.target.copy(orgTarget);
        }
        this.camera.lookAt(this.controls.target);
        this.controls.update();
        break;
      }
      case HighlightMode.HIGHLIGHT:
        this.controls.position0 = this.camera.position.clone();
        this.controls.target0 = this.viewTarget.clone();
        this.controls.target = this.viewTarget.clone();
        break;
      case HighlightMode.ORBIT:
        this.controls.update();
        break;
      default:
        this.controls.update();
        break;
    }

    this.lastTime = currentTime;
  }

  private v3interpolateTo(current: Vector3, target: Vector3, deltaTime: number, speed: number) {
    if (speed <= 0) {
      return current.set(target.x, target.y, target.z);
    }

    const dist = target.clone().sub(current);

    if (dist.lengthSq() < this.EPS) {
      return current.set(target.x, target.y, target.z);
    }

    const deltaMove = dist.multiplyScalar(this.clamp((deltaTime / 1000) * speed, 0, 1));
    return current.add(deltaMove);
  }
}
