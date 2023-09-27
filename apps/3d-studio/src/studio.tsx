import { ILogger } from '@schablone/logging';
import { ConfigProvider, StudioConfig } from './provider';
import { FC } from 'react';
import { RouterBase } from './components';
import { LoggingProvider } from '@schablone/logging-react';

export interface StudioProps {
  logger?: ILogger;
  config: StudioConfig;
}

export const Studio: FC<StudioProps> = ({ logger, config }) => {
  return (
    <LoggingProvider logger={logger} options={{}}>
      <ConfigProvider config={config}>
        <RouterBase />
      </ConfigProvider>
    </LoggingProvider>
  );
};
