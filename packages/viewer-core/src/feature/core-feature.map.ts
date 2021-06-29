import { interfaces } from 'inversify';
import ServiceIdentifier = interfaces.ServiceIdentifier;
import { IFeature } from '../types';
import { WireframeFeature } from './features/wireframe.feature';



export enum CoreFeature {
    Wireframe = 'wireframe'
}



export const coreFeatures: {[key in CoreFeature]: ServiceIdentifier<IFeature>} = {
    [CoreFeature.Wireframe]: WireframeFeature
};
