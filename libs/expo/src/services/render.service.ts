import {
  defaultCameraConfig,
  defaultRenderConfig,
  RenderService,
  SizeModel,
  ViewerConfigModel,
} from '@alchemisten/3d-studio-viewer-core';
import { injectable } from 'inversify';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { Renderer } from 'expo-three';

@injectable()
export class ExpoRenderService extends RenderService {
  public init(config: ViewerConfigModel, context?: HTMLElement | WebGL2RenderingContext): void {
    this.logger.debug(Object.prototype.toString.call(context));
    if (context && !(context instanceof WebGL2RenderingContext)) {
      this.logger.fatal('This renderer needs a WebGL2RenderingContext to render into.');
      return;
    }

    const renderSize: SizeModel = context
      ? { height: context.drawingBufferHeight, width: context.drawingBufferWidth }
      : config.render?.renderSize ?? defaultRenderConfig.renderSize;
    this.renderer = new Renderer({ antialias: true, alpha: true, gl: context as unknown as WebGL2RenderingContext });
    this.composer = new EffectComposer(this.renderer);

    this.setCameraConfig(
      Object.assign(
        defaultCameraConfig,
        {
          aspect: renderSize.width / renderSize.height,
        },
        config.camera
      )
    );
    this.setRenderConfig(
      Object.assign(
        defaultRenderConfig,
        {
          pixelRatio: window ? window.devicePixelRatio : 1,
          renderSize,
        },
        config.render
      )
    );
  }
}
