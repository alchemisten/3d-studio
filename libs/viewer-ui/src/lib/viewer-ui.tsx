import { IViewer } from '@alchemisten/3d-studio-viewer-core';
import React, { FC } from 'react';
import styles from './viewer-ui.module.scss';

/* eslint-disable-next-line */
export interface ViewerUIProps {
  viewer: IViewer;
}

export const ViewerUI: FC<ViewerUIProps> = () => {
  return <div className={styles.viewerUi}>The UI!</div>;
};
