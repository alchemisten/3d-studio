import { createContext, FC, PropsWithChildren, useContext } from 'react';

export interface StudioConfig {
  baseUrl: string;
}

export const defaultConfig: StudioConfig = {
  baseUrl: 'http://localhost:3000',
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
