import { IViewer } from '@alchemisten/3d-studio-viewer-core';
import React, { FC, useEffect, useState } from 'react';
import { TranslationsProvider } from 'react-intl-provider';
import { FormattedMessage } from 'react-intl';

import { Controls, TextBox } from '../components';
import { translations } from '../i18n';
import { LoadingIndicator } from '../components/loading-indictator/loading-indicator';
import styles from './viewer-ui.module.scss';

export interface ViewerUIProps {
  viewer: IViewer;
}

export const ViewerUI: FC<ViewerUIProps> = ({ viewer }) => {
  const [introClosed, setIntroClosed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [objectLoaded, setObjectLoaded] = useState(false);

  const handleUIClick = () => {
    if (!isLoading) {
      setIntroClosed(true);
    }
  };

  useEffect(() => {
    viewer.assetService.getIsLoading().subscribe((loading) => {
      setIsLoading(loading);
    });
    viewer.assetService.hookObjectLoaded$.subscribe((loaded) => {
      setObjectLoaded(true);
    });
  }, [viewer]);

  return (
    <TranslationsProvider initialLanguage="de" initialTranslations={translations}>
      <div className={`${styles.viewerUi} ${introClosed ? styles.clicked : ''}`} onClick={handleUIClick}>
        <Controls />
        {!introClosed && (
          <TextBox position="intro">
            {isLoading && <LoadingIndicator />}
            {objectLoaded && <FormattedMessage id="intro" />}
          </TextBox>
        )}
      </div>
    </TranslationsProvider>
  );
};
