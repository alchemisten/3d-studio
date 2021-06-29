import { interfaces } from 'inversify';
import ServiceIdentifier = interfaces.ServiceIdentifier;
import { IFeature } from '../types';



export enum CoreFeature {}



export const coreFeatures: {[key in CoreFeature]: ServiceIdentifier<IFeature>} = {};
