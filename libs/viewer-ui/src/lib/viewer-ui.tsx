import { IViewer } from '@alchemisten/3d-studio-viewer-core';
import React, { FC, useState } from 'react';
import { TranslationsProvider } from 'react-intl-provider';
import { FormattedMessage } from 'react-intl';
import { Controls, TextBox } from '../components';
import { translations } from '../i18n';
import styles from './viewer-ui.module.scss';

export interface ViewerUIProps {
  viewer: IViewer;
}

export const ViewerUI: FC<ViewerUIProps> = ({ viewer }) => {
  const [introClosed, setIntroClosed] = useState(false);

  const handleUIClick = () => {
    setIntroClosed(true);
  };

  return (
    <TranslationsProvider initialLanguage="de" initialTranslations={translations}>
      <div className={`${styles.viewerUi} ${introClosed ? styles.clicked : ''}`} onClick={handleUIClick}>
        <Controls />
        {!introClosed && (
          <TextBox position="intro">
            <FormattedMessage id="intro" />
          </TextBox>
        )}
      </div>
    </TranslationsProvider>
  );
};
