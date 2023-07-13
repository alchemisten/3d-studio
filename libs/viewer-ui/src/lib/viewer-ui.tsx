import { HighlightFeatureToken, IFeature, IHighlightFeature, IViewer } from '@alchemisten/3d-studio-viewer-core';
import React, { FC, useEffect, useState } from 'react';
import { TranslationsProvider } from 'react-intl-provider';
import { FormattedMessage } from 'react-intl';
import { Subscription } from 'rxjs';

import { Controls, HighlightUi, TextBox } from '../components';
import { translations } from '../i18n';
import { ViewerProvider } from '../provider/viewer.provider';
import { AnimationBar, LoadingIndicator } from '../components';
import styles from './viewer-ui.module.scss';

export interface ViewerUIProps {
  viewer: IViewer;
}

export interface FeatureMap {
  [key: symbol]: IFeature;
}

export const ViewerUI: FC<ViewerUIProps> = ({ viewer }) => {
  const [introClosed, setIntroClosed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [objectLoaded, setObjectLoaded] = useState(false);
  const [features, setFeatures] = useState<FeatureMap>({});

  const handleUIClick = () => {
    if (!isLoading) {
      setIntroClosed(true);
    }
  };

  useEffect(() => {
    const subscription = new Subscription();

    subscription.add(
      viewer.assetService.getIsLoading().subscribe((loading) => {
        setIsLoading(loading);
      })
    );
    subscription.add(
      viewer.assetService.hookObjectLoaded$.subscribe(() => {
        setObjectLoaded(true);
      })
    );
    subscription.add(
      viewer.featureService.getFeatures().subscribe((features) => {
        setFeatures(
          features.reduce((all, feature) => {
            all[feature.id] = feature;
            return all;
          }, {} as FeatureMap)
        );
      })
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [viewer]);

  return (
    <TranslationsProvider initialLanguage="de" initialTranslations={translations}>
      <ViewerProvider viewer={viewer}>
        <div className={`${styles.viewerUi} ${introClosed ? styles.clicked : ''}`} onClick={handleUIClick}>
          <Controls />
          {!introClosed && (
            <TextBox position="intro">
              {isLoading && <LoadingIndicator />}
              {objectLoaded && <FormattedMessage id="intro" />}
            </TextBox>
          )}
          <AnimationBar />
          {features[HighlightFeatureToken] && (
            <HighlightUi feature={features[HighlightFeatureToken] as IHighlightFeature} />
          )}
        </div>
      </ViewerProvider>
    </TranslationsProvider>
  );
};
