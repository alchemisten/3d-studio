import { FC, useEffect, useRef, useState } from 'react';
import { TranslationsProvider } from 'react-intl-provider';
import { useParams, useSearchParams } from 'react-router-dom';
import { ViewerUI } from '@schablone/3d-studio-viewer-ui';
import { ISkyboxFeature, IViewer, SkyboxFeatureToken, ViewerLauncher } from '@schablone/3d-studio-viewer-core';
import { Subscription } from 'rxjs';
import { useQuery } from '@tanstack/react-query';
import { useLogger } from '@schablone/logging-react';

import { LoadingScreen } from '../../components';
import { translations } from '../../i18n';
import { useConfigContext } from '../../provider';
import styles from './project.module.scss';

export const Project: FC = () => {
  const { logger } = useLogger();
  const { baseUrl, customStyles, pathAllProjects, pathSingleProject, projectParser } = useConfigContext();
  const { id } = useParams();
  const { data, error, isError, isLoading, isSuccess } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetch(`${baseUrl}${pathSingleProject}${id}`).then((res) => res.json()),
  });
  const { data: customer } = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetch(`${baseUrl}${pathAllProjects}`).then((res) => res.json()),
  });
  const viewerCanvas = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const [logo] = useState(searchParams.get('l') === 'true');
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [playClicked, setPlayClicked] = useState(searchParams.get('e') !== 'true');
  const [title, setTitle] = useState<string>();
  const [viewer, setViewer] = useState<IViewer>();
  const [launcher] = useState(new ViewerLauncher({ logger }));

  const transparent = searchParams.get('t') === 'true';
  const initialLanguage = searchParams.get('lng');
  const availableLanguages = Object.keys(translations);
  const startLanguage = initialLanguage && availableLanguages.includes(initialLanguage) ? initialLanguage : 'de';

  useEffect(() => {
    if (isError) {
      logger.error('Error loading project', { objects: { baseUrl, pathSingleProject }, error });
    }
  }, [baseUrl, error, isError, logger, pathSingleProject]);

  useEffect(() => {
    if (!viewerCanvas.current || !id) {
      return;
    }

    const allowZoom = searchParams.get('s') !== 'false';

    if (isSuccess) {
      const projectData = projectParser ? projectParser(id, data) : data;
      setViewer(launcher.createCanvasViewer({ ...projectData, controls: { allowZoom } }, viewerCanvas.current));
      setIsLoadingAssets(true);
    }
  }, [data, id, isSuccess, launcher, projectParser, searchParams]);

  useEffect(() => {
    if (!viewer) {
      return;
    }

    const subscription = new Subscription();

    subscription.add(
      viewer.assetService.getIsLoading().subscribe((loading) => {
        setIsLoadingAssets(loading);
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
            isLoading={isLoadingAssets || isLoading}
            onPlayClicked={() => setPlayClicked(true)}
            title={title}
            transparent={transparent}
          />
        </TranslationsProvider>
      ) : (
        viewer && (
          <ViewerUI
            className={customStyles?.viewerUI}
            initialLanguage={initialLanguage}
            logo={logo && customer?.logo ? <img src={`${baseUrl}${customer?.logo}`} alt={customer.name} /> : undefined}
            viewer={viewer}
          />
        )
      )}
    </>
  );
};
