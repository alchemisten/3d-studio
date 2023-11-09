import { FC, useEffect, useState } from 'react';
import { useTranslations } from 'react-intl-provider';
import type { IViewer, ViewerConfigModel } from '@schablone/3d-studio-viewer-core';

import { cleanHTML } from '../../util';
import { LoadingIndicator } from '../loading-indictator/loading-indicator';
import { TextBox } from '../text-box/text-box';

export interface IntroProps {
  isLoading: boolean;
  setIntroClosed: (closed: boolean) => void;
  viewer: IViewer;
}

export const Intro: FC<IntroProps> = ({ isLoading, setIntroClosed, viewer }) => {
  const { currentLanguage } = useTranslations();
  const [config, setConfig] = useState<ViewerConfigModel | null>(null);

  useEffect(() => {
    const subscription = viewer.configService.getConfig().subscribe((config) => {
      if (!config.project?.introText) {
        setIntroClosed(true);
      }
      setConfig(config);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setIntroClosed, viewer]);

  return (
    <TextBox position="intro">
      {isLoading && <LoadingIndicator />}
      {cleanHTML(config?.project?.introText?.[currentLanguage].intro)}
    </TextBox>
  );
};
