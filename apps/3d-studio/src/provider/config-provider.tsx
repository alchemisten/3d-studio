import { createContext, FC, PropsWithChildren, useContext } from 'react';
import { ViewerConfigModel } from '@alchemisten/3d-studio-viewer-core';

export interface StudioConfig {
  baseUrl: string;
  projectLoader: (projectId: string, baseUrl: string) => Promise<ViewerConfigModel>;
}

export const defaultConfig: StudioConfig = {
  baseUrl: 'http://localhost:3000',
  projectLoader: async () => Promise.reject('No project loader defined'),
};

export const ConfigContext = createContext<StudioConfig>(defaultConfig);

export const useConfigContext = () => {
  return useContext(ConfigContext);
};

export interface ConfigProviderProps extends PropsWithChildren {
  config: StudioConfig;
}

export const ConfigProvider: FC<ConfigProviderProps> = ({ children, config }) => {
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
};
