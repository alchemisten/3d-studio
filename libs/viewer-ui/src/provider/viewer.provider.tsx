import { createContext, FC, PropsWithChildren, useContext } from 'react';
import { IViewer } from '@alchemisten/3d-studio-viewer-core';

export const ViewerContext = createContext<IViewer | null>(null);

export const useViewerContext = () => {
  return useContext(ViewerContext);
};

export interface ViewerProviderProps extends PropsWithChildren {
  viewer: IViewer;
}

export const ViewerProvider: FC<ViewerProviderProps> = ({ children, viewer }) => {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
};
