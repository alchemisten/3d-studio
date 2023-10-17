import { createContext, FC, PropsWithChildren, useContext } from 'react';
import { ViewerConfigModel } from '@alchemisten/3d-studio-viewer-core';

export interface StudioConfig {
  /**
   * Base url for all API calls
   */
  baseUrl: string;
  /**
   * Custom styles for the studio
   */
  customStyles?: {
    /**
     * Custom styles for the viewer UI, the provided class will be added to the
     * root element of the viewer UI.
     */
    viewerUI?: string;
  };
  /**
   * Custom path for the API call to get all projects, default to `{baseUrl}/api/customer/projects/`
   */
  pathAllProjects?: string;
  /**
   * Custom path for the API call to get a single project, default to `{baseUrl}/api/projects/`
   */
  pathSingleProject?: string;
  /**
   * Optional parser for the project data. If no parser is provided, the data will be used as is.
   *
   * @param id The id of the project
   * @param data The data of the project as returned by the API
   */
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
