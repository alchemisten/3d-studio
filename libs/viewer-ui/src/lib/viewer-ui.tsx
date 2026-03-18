import { HighlightFeatureToken, IFeature, IViewer } from '@schablone/3d-studio-viewer-core';
import { ComponentType, FC, PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { TranslationsProvider } from 'react-intl-provider';
import { combineLatest, map, Subscription } from 'rxjs';

import type { FeatureMap } from '../types';
import { AnimationBar, Controls, HighlightUi, Intro } from '../components';
import { translations } from '../i18n';
import { ViewerProvider } from '../provider';
import styles from './viewer-ui.module.scss';

export interface ViewerUIProps extends PropsWithChildren {
  className?: string;
  featureComponents?: Record<string, ComponentType<{ feature: IFeature }>>;
  initialLanguage?: string | null;
  logo?: ReactNode;
  viewer: IViewer;
}

export const ViewerUI: FC<ViewerUIProps> = ({
  children,
  className,
  featureComponents,
  initialLanguage = 'de',
  logo,
  viewer,
}) => {
  const [features, setFeatures] = useState<FeatureMap>({});
  const [introClosed, setIntroClosed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>({});

  const availableLanguages = Object.keys(translations);

  const allFeatureComponents: Record<string, ComponentType<{ feature: IFeature }>> = {
    [String(HighlightFeatureToken)]: HighlightUi as ComponentType<{ feature: IFeature }>,
    ...featureComponents,
  };

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
      }),
    );

    subscription.add(
      viewer.featureService.getFeatures().subscribe((featureList) => {
        setFeatures(
          featureList.reduce((all, feature) => {
            all[String(feature.id)] = feature;
            return all;
          }, {} as FeatureMap),
        );
      }),
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [viewer]);

  useEffect(() => {
    const subscription = new Subscription();

    subscription.add(
      combineLatest(Object.values(features).map((feature) => feature.getEnabled()))
        .pipe(
          map((enabledList) => {
            return Object.keys(features).reduce(
              (acc, feat, index) => {
                acc[feat] = enabledList[index];
                return acc;
              },
              {} as Record<string, boolean>,
            );
          }),
        )
        .subscribe((enabledMap) => {
          setEnabledFeatures(enabledMap);
        }),
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [features]);

  return (
    <TranslationsProvider
      initialLanguage={initialLanguage && availableLanguages.includes(initialLanguage) ? initialLanguage : 'de'}
      initialTranslations={translations}
    >
      <ViewerProvider viewer={viewer}>
        <div className={`${styles.viewerUi} ${className || ''} ${introClosed ? styles.clicked : ''}`}>
          {logo && <div className={styles.logo}>{logo}</div>}
          {!introClosed && (
            <div className={styles.clickzone} onClick={handleUIClick}>
              <Intro isLoading={isLoading} viewer={viewer} setIntroClosed={setIntroClosed} />
            </div>
          )}
          <Controls features={features} />
          <AnimationBar />
          {Object.entries(allFeatureComponents).map(([key, Component]) => {
            const feature = features[key];
            if (!feature || !enabledFeatures[key]) {
              return null;
            }
            return <Component key={key} feature={feature} />;
          })}
          {children}
        </div>
      </ViewerProvider>
    </TranslationsProvider>
  );
};
