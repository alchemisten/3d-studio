import React, { FC } from 'react';
import { FormattedMessage } from 'react-intl';

import styles from './loading-screen.module.scss';

export interface LoadingScreenProps {
  isLoading: boolean;
  onPlayClicked: () => void;
  title?: string;
  transparent?: boolean;
}

export const LoadingScreen: FC<LoadingScreenProps> = ({ isLoading, onPlayClicked, title, transparent = false }) => {
  return (
    <div className={`${styles.loadingScreen} ${transparent ? styles.transparent : ''}`}>
      {!transparent && <img className={styles.background} src="assets/bg_scene_default.jpg" alt="Blurry background" />}
      <button type="button" className={styles.button} onClick={onPlayClicked} disabled={isLoading}>
        <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 5v14l11-7z"></path>
          <path d="M0 0h24v24H0z" fill="none"></path>
        </svg>
      </button>

      <div className={styles.box}>{isLoading ? <FormattedMessage id="general.loading" /> : title}</div>
    </div>
  );
};
