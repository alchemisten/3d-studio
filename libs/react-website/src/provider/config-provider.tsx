import { ComponentType, createContext, FC, PropsWithChildren, useContext } from 'react';
import { IFeature, ViewerConfigModel } from '@schablone/3d-studio-viewer-core';
import type { interfaces } from 'inversify';

export interface StudioConfig {
  basename?: string;
  baseUrl: string;
  customFeatures?: Record<string, interfaces.ServiceIdentifier<IFeature>>;
  customStyles?: {
    viewerUI?: string;
  };
  featureComponents?: Record<string, ComponentType<{ feature: IFeature }>>;
  pathAllProjects?: string;
  pathSingleProject?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projectParser?: (id: string, data: any) => ViewerConfigModel;
}

export const defaultConfig: StudioConfig = {
  baseUrl: 'http://localhost:3000',
  pathAllProjects: '/api/customer/projects/',
  pathSingleProject: '/api/projects/',
  projectParser: (id, data) => data as ViewerConfigModel,
};

export const ConfigContext = createContext<StudioConfig>(defaultConfig);

export const useConfigContext = () => {
  return useContext(ConfigContext);
};

export interface ConfigProviderProps extends PropsWithChildren {
  config: StudioConfig;
}

export const ConfigProvider: FC<ConfigProviderProps> = ({ children, config }) => {
  return <ConfigContext.Provider value={Object.assign({}, defaultConfig, config)}>{children}</ConfigContext.Provider>;
};
