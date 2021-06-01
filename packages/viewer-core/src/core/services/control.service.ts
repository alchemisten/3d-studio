import {PerspectiveCamera} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {fromEvent, Observable, Subject, Subscription} from 'rxjs';
import {take, withLatestFrom} from 'rxjs/operators';
import {IControlService} from '../../types';
import {provideSingleton} from 'util/inversify';
import {RenderService} from './render.service';



@provideSingleton(ControlService)
export class ControlService implements IControlService {
    private controls: OrbitControls;
    private controls$: Subject<OrbitControls>;
    private changeSub: Subscription;

    constructor(
        private renderService: RenderService
    ) {
        this.controls$ = new Subject<OrbitControls>();
        this.renderService.getCamera().pipe(
            take(1)
        ).subscribe(this.createControls.bind(this));
        this.renderService.hookAfterRender$.pipe(
            withLatestFrom(this.renderService.getRenderConfig())
        ).subscribe(([afterRender, config]) => {
            if (this.controls && this.controls.autoRotate && config.continuousRendering) {
                this.controls.update();
            }
        });
    }



    getControls(): Observable<OrbitControls> {
        return this.controls$.asObservable();
    }


    private createControls(camera: PerspectiveCamera) {
        if (this.changeSub) {
            this.changeSub.unsubscribe();
        }
        this.controls = new OrbitControls(camera, this.renderService.renderer.domElement);
        this.controls.dampingFactor = 0.15;
        this.controls.enableDamping = true;
        this.controls.autoRotateSpeed = 0.2;
        this.controls.enablePan = true;
        this.controls.maxDistance = 500;
        this.changeSub = fromEvent(this.controls, 'change').pipe(
            withLatestFrom(this.renderService.getRenderConfig())
        ).subscribe(([event, config]) => {
            if (!config.continuousRendering) {
                this.renderService.renderSingleFrame();
            }
        });

        this.controls$.next(this.controls);
    }
}