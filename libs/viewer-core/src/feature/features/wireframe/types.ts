import { IFeature } from '../../../types';

export interface IWireframeFeature extends IFeature {
  setWireframeEnabled(enabled: boolean): void;
}
