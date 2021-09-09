import { interfaces } from 'inversify';
import ServiceIdentifier = interfaces.ServiceIdentifier;
import { IFeature } from '../types';
import { WireframeFeature } from './features/wireframe.feature';
import { CameraRotationFeature } from './features/camera-rotation.feature';
import { LightScenarioFeature } from './features/light-scenario.feature';



export enum CoreFeature {
    CameraRotation = 'cameraRotation',
    LightScenario = 'lightScenario',
    Wireframe = 'wireframe'
}



export const coreFeatures: {[key in CoreFeature]: ServiceIdentifier<IFeature>} = {
    [CoreFeature.CameraRotation]: CameraRotationFeature,
    [CoreFeature.LightScenario]: LightScenarioFeature,
    [CoreFeature.Wireframe]: WireframeFeature
};
