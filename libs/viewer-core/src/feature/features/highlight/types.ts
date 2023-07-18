import type { Object3D, Texture, Vector2, Vector3 } from 'three';
import type { Observable } from 'rxjs';
import type { I18nLanguageMap } from '../../../types';
import type { FeatureConfig, IFeature } from '../../types';
import type Highlight from './highlight';

export enum HighlightMode {
  ORBIT,
  TO_HIGHLIGHT,
  HIGHLIGHT,
  TO_ORBIT,
}

export type HighlightWorldPosition = {
  positionType: 'WORLD';
  position: Vector3;
};
export type HighlightScreenPosition = {
  positionType: 'SCREEN';
  position: Vector2;
};
export type HighlightModelId = string;
export type HighlightModel = {
  cameraPosition: Vector3;
  cameraTarget: Vector3;
  i18n: I18nLanguageMap;
  id: HighlightModelId;
};

export interface HighlightSetupModel {
  animation?: HighlightAnimation;
  cam: {
    x: number;
    y: number;
    z: number;
  };
  color?: string;
  i18n?: I18nLanguageMap;
  id: HighlightModelId;
  isTrigger?: boolean;
  fov?: number;
  mount?: string | null;
  nodes?: string[];
  pos: {
    x: number;
    y: number;
    z: number;
  };
  scale?: number;
  speed?: HighlightSpeed;
  target: {
    x: number;
    y: number;
    z: number;
  };
  visibility?: HighlightVisibility;
}

export interface HighlightTextureMap {
  actionTransTex: Texture | null;
  actionTransHoverTex: Texture | null;
  simpleTransTex: Texture | null;
  simpleTransHoverTex: Texture | null;

  [key: string]: Texture | null;
}

export interface HighlightVisibility {
  from: number;
  to: number;
  whenPlaying: boolean;
}

export interface HighlightAnimation {
  delay: number;
  targetTime: number;
  teleport: boolean;
  timeUnit: string;
}

export interface HighlightSpeed {
  in: number;
  out: number;
  fov: number;
}

export interface HighlightMount {
  element: Object3D | null;
  name: string | null;
  relativeTransform?: Vector3;
}

export interface HighlightFeatureConfig extends FeatureConfig {
  groupScale?: number;
  highlightSetup: HighlightSetupModel[];
  highlightsVisible?: boolean;
}

export interface IHighlightFeature extends IFeature {
  focusHighlight(id: HighlightModelId): void;
  getFocusedHighlight(): Observable<Highlight | null>;
  getHighlights(): Observable<Highlight[]>;
}
