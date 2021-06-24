import { PCFSoftShadowMap, sRGBEncoding, Vector3 } from 'three';
import { provideSingleton } from 'util/inversify';
import { CameraConfigModel, IConfigService, RenderConfigModel, ViewerConfigModel } from '../../types';



export const defaultRenderConfig = <RenderConfigModel>{
    autoClear: true,
    clearColor: {
        alpha: 0.0,
        color: '#000000'
    },
    continuousRendering: false,
    outputEncoding: sRGBEncoding,
    pixelRatio: 1,
    renderSize: {
        height: 768,
        width: 1024
    },
    shadowMapEnabled: true,
    shadowMapType: PCFSoftShadowMap
};

export const defaultCameraConfig = <CameraConfigModel>{
    aspect: 1024 / 768,
    far: 20000,
    fov: 37,
    near: 0.1,
    position: new Vector3(10, 10, 5),
    target: new Vector3(0, 0, 0)
};



@provideSingleton(ConfigService)
export class ConfigService implements IConfigService {
    private config: ViewerConfigModel;

    constructor() {
    }

    getConfig(): ViewerConfigModel {
        return this.config;
    }

    loadConfig(config: ViewerConfigModel) {
        this.config = config;
    }
}
