import { createContext, FC, PropsWithChildren, useContext } from 'react';
import { ViewerConfigModel } from '@alchemisten/3d-studio-viewer-core';

export interface StudioConfig {
  baseUrl: string;
  customStyles?: {
    viewerUI?: string;
  };
  pathAllProjects?: string;
  pathSingleProject?: string;
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
