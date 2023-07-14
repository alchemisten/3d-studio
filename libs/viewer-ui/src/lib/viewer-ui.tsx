import { HighlightFeatureToken, IHighlightFeature, IViewer } from '@alchemisten/3d-studio-viewer-core';
import React, { FC, useEffect, useState } from 'react';
import { TranslationsProvider } from 'react-intl-provider';
import { FormattedMessage } from 'react-intl';
import { Subscription } from 'rxjs';

import type { FeatureMap } from '../types';
import { AnimationBar, Controls, HighlightUi, LoadingIndicator, TextBox } from '../components';
import { translations } from '../i18n';
import { ViewerProvider } from '../provider';
import styles from './viewer-ui.module.scss';

export interface ViewerUIProps {
  viewer: IViewer;
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
      viewer.featureService.getFeatures().subscribe((featureList) => {
        setFeatures(
          featureList.reduce((all, feature) => {
            all[String(feature.id)] = feature;
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
          <Controls features={features} />
          {!introClosed && (
            <TextBox position="intro">
              {isLoading && <LoadingIndicator />}
              {objectLoaded && <FormattedMessage id="intro" />}
            </TextBox>
          )}
          <AnimationBar />
          {features[String(HighlightFeatureToken)] && (
            <HighlightUi feature={features[String(HighlightFeatureToken)] as IHighlightFeature} />
          )}
        </div>
      </ViewerProvider>
    </TranslationsProvider>
  );
};
