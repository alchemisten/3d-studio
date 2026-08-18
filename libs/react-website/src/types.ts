import type { ComponentType } from 'react';
import type { IFeature } from '@schablone/3d-studio-viewer-core';

export interface CodeParams {
  allowZoom?: boolean;
  height: string;
  iframe: boolean;
  language: string;
  logo?: boolean;
  togglePlay?: boolean;
  transparent?: boolean;
  width: string;

  [key: string]: string | boolean | undefined;
}

export type FeatureComponentList = Record<string, ComponentType<{ feature: IFeature }>>;

export interface LegacyConfig {
  color: string;
  key: string;
  logo: string;
  name: string;
  projects: LegacyProject[];
}

export interface LegacyProject {
  changeDate: number;
  description: string;
  image: string;
  key: string;
  languages: string[];
  name: string;
  version: number;
}

export interface RouterConfig {
  /**
   * The initial route the memory router starts at, for example
   * `/view/my-project-id`. Only used when mode is `memory`, defaults to `/`.
   */
  initialEntry?: string;
  /**
   * The router implementation to use. `browser` (the default) reads the route
   * from the document url. `memory` keeps the route in memory only, which is
   * required in environments without a usable History API.
   */
  mode: 'browser' | 'memory';
}
