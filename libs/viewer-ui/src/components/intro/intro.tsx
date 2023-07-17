import React, { FC, useEffect, useState } from 'react';
import { useTranslations } from 'react-intl-provider';
import type { IViewer, ViewerConfigModel } from '@alchemisten/3d-studio-viewer-core';

import { LoadingIndicator } from '../loading-indictator/loading-indicator';
import { TextBox } from '../text-box/text-box';

export interface IntroProps {
  isLoading: boolean;
  viewer: IViewer;
}

export const Intro: FC<IntroProps> = ({ isLoading, viewer }) => {
  const { currentLanguage } = useTranslations();
  const [config, setConfig] = useState<ViewerConfigModel | null>(null);

  useEffect(() => {
    const subscription = viewer.configService.getConfig().subscribe((config) => {
      setConfig(config);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [viewer]);

  return (
    <TextBox position="intro">
      {isLoading && <LoadingIndicator />}
      {config?.project?.introText?.[currentLanguage].intro}
    </TextBox>
  );
};
