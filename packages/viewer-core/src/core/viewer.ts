import {provide} from 'inversify-binding-decorators';
import {fromEvent} from 'rxjs';
import {debounceTime} from 'rxjs/operators';
import {IViewer, SizeModel, ViewerConfigModel} from '../types';
import {SceneService} from './services/scene.service';
import {
    AmbientLight,
    DirectionalLight,
    Object3D,
} from 'three';
import {RenderService} from './services/render.service';
import {LightService} from './services/light.service';
import {AssetService} from './services/asset.service';
import {ControlService} from './services/control.service';
import {MaterialService} from './services/material.service';
import { ConfigService } from './services/config.service';
import { AnimationService } from './services/animation.service';
import { FeatureService } from '../feature/services/feature.service';



/**
 * The viewer initializes all required services with the provided config.
 */
@provide(Viewer)
export class Viewer implements IViewer {
    private node: HTMLElement;

    constructor(
        private animationService: AnimationService,
        private assetService: AssetService,
        private configService: ConfigService,
        private controlService: ControlService,
        private featureService: FeatureService,
        private lightService: LightService,
        private materialService: MaterialService,
        private renderService: RenderService,
        private sceneService: SceneService,
    ) {}



    init(screenSize: SizeModel, config: ViewerConfigModel, node?: HTMLElement) {
        this.configService.loadConfig(config);
        this.renderService.setCameraConfig(Object.assign({
            aspect: screenSize.width / screenSize.height
        }, config.camera));
        this.renderService.setRenderConfig(Object.assign({
            pixelRatio: window ? window.devicePixelRatio : 1,
            renderSize: screenSize
        }, config.render));
        if (node && window) {
            this.node = node;
            this.node.appendChild(this.renderService.renderer.domElement);

            fromEvent(window, 'resize').pipe(
                debounceTime(300)
            ).subscribe(this.onWindowResize.bind(this));
        }

        config.objects.forEach(object => {
            this.assetService.loadObject(object.path).then((loaded) => {
                this.sceneService.addObjectToScene(loaded);
                this.renderService.renderSingleFrame();
                this.animationService.addMixerForObject(loaded);
            });
        });
    }


    private onWindowResize() {
        if (!this.node) {
            return;
        }

        const screenSize = this.node.getBoundingClientRect() as SizeModel;
        this.renderService.setRenderConfig({
            renderSize: screenSize
        });
        this.renderService.setCameraConfig({
            aspect: screenSize.width / screenSize.height
        });
        this.renderService.renderSingleFrame();
    }
}
