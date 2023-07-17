import { HighlightFeatureToken, IHighlightFeature, IViewer } from '@alchemisten/3d-studio-viewer-core';
import React, { FC, PropsWithChildren, useEffect, useState } from 'react';
import { TranslationsProvider } from 'react-intl-provider';
import { Subscription } from 'rxjs';

import type { FeatureMap } from '../types';
import { AnimationBar, Controls, HighlightUi, Intro } from '../components';
import { translations } from '../i18n';
import { ViewerProvider } from '../provider';
import styles from './viewer-ui.module.scss';

export interface ViewerUIProps extends PropsWithChildren {
  viewer: IViewer;
}

export const ViewerUI: FC<ViewerUIProps> = ({ children, viewer }) => {
  const [introClosed, setIntroClosed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
          {!introClosed && <Intro isLoading={isLoading} viewer={viewer} />}
          <AnimationBar />
          {features[String(HighlightFeatureToken)] && (
            <HighlightUi feature={features[String(HighlightFeatureToken)] as IHighlightFeature} />
          )}
          {children}
        </div>
      </ViewerProvider>
    </TranslationsProvider>
  );
};
