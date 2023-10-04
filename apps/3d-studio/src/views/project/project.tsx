import { FC, useEffect, useRef, useState } from 'react';
import { TranslationsProvider } from 'react-intl-provider';
import { useParams, useSearchParams } from 'react-router-dom';
import { ViewerUI } from '@alchemisten/3d-studio-viewer-ui';
import { ISkyboxFeature, IViewer, SkyboxFeatureToken, ViewerLauncher } from '@alchemisten/3d-studio-viewer-core';
import { Subscription } from 'rxjs';
import { useLogger } from '@schablone/logging-react';

import { LoadingScreen } from '../../components';
import { translations } from '../../i18n';
import { useConfigContext } from '../../provider';
import styles from './project.module.scss';

const launcher = new ViewerLauncher();

export const Project: FC = () => {
  const { baseUrl, projectLoader } = useConfigContext();
  const { id } = useParams();
  const { logger } = useLogger();
  const viewerCanvas = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const [alcmLogo] = useState(searchParams.get('l') === 'true');
  const [isLoading, setIsLoading] = useState(true);
  const [playClicked, setPlayClicked] = useState(searchParams.get('e') !== 'true');
  const [title, setTitle] = useState<string>();
  const [viewer, setViewer] = useState<IViewer>();

  const transparent = searchParams.get('t') === 'true';
  const initialLanguage = searchParams.get('lng');
  const availableLanguages = Object.keys(translations);
  const startLanguage = initialLanguage && availableLanguages.includes(initialLanguage) ? initialLanguage : 'de';

  useEffect(() => {
    if (!viewerCanvas.current || !id) {
      return;
    }

    const allowZoom = searchParams.get('s') !== 'false';
    setIsLoading(true);

    projectLoader(id, baseUrl)
      .then((project) => {
        if (viewerCanvas.current) {
          setViewer(launcher.createHTMLViewer(viewerCanvas.current, { ...project, controls: { allowZoom } }));
        }
      })
      .catch((error) => {
        logger.error('Error while loading project with id:', { objects: id, error });
        setIsLoading(false);
      });
  }, [baseUrl, id, logger, projectLoader, searchParams]);

  useEffect(() => {
    if (!viewer) {
      return;
    }

    const subscription = new Subscription();

    subscription.add(
      viewer.assetService.getIsLoading().subscribe((loading) => {
        setIsLoading(loading);
      })
    );

    subscription.add(
      viewer.configService.getConfig().subscribe((config) => {
        setTitle(config.project?.name);
      })
    );

    if (transparent) {
      subscription.add(
        viewer.featureService.getFeatures().subscribe((features) => {
          const skyboxFeature = features.find((feature) => feature.id === SkyboxFeatureToken) as ISkyboxFeature;
          skyboxFeature.setEnabled(false);
        })
      );
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [transparent, viewer]);

  return (
    <>
      <div ref={viewerCanvas} className={`${styles.viewerCanvas} ${!playClicked ? styles.hidden : ''}`} />
      {!playClicked ? (
        // TranslationsProvider is currently only used here because nesting it above the ViewerUI causes a rendering loop
        <TranslationsProvider initialLanguage={startLanguage} initialTranslations={translations}>
          <LoadingScreen
            isLoading={isLoading}
            onPlayClicked={() => setPlayClicked(true)}
            title={title}
            transparent={transparent}
          />
        </TranslationsProvider>
      ) : (
        viewer && (
          <ViewerUI
            viewer={viewer}
            initialLanguage={initialLanguage}
            logo={
              alcmLogo ? (
                <a
                  href="https://alchemisten.ag"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ pointerEvents: 'all' }}
                >
                  <img src="assets/alchemisten-logo.svg" alt="Alchemisten AG Logo" />
                </a>
              ) : undefined
            }
          />
        )
      )}
    </>
  );
};
