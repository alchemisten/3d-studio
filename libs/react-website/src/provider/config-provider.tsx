import type { FC, PropsWithChildren } from 'react';
import { createContext, useContext } from 'react';
import type { CustomFeatureList, ViewerConfigModel } from '@schablone/3d-studio-viewer-core';
import type { FeatureComponentList } from '../types';

export interface StudioConfig {
  /**
   * The basename of the app for situations where you can't deploy to the root of the domain, but a subdirectory. Used only for the router.
   */
  basename?: string;
  /**
   * Base url for all API calls
   */
  baseUrl: string;
  /**
   * A record of custom features that will be added to the feature registry.
   * The key is the ID for the feature as a string, the value has to be an
   * inversify service and implement the IFeature interface.
   */
  customFeatures?: CustomFeatureList;
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
   * A record of custom components that will be added to the viewer UI, if the
   * corresponding feature is used in the Studio.
   * The key is the ID of the feature as a string, the value has to be a React
   * component that accepts a parameter name feature of the type IFeature.
   */
  featureComponents?: FeatureComponentList;
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
