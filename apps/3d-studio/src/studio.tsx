import { FC } from 'react';
import { ILogger, LoggerFactory } from '@schablone/logging';
import { LoggingProvider } from '@schablone/logging-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ConfigProvider, StudioConfig } from './provider';
import { RouterBase } from './components';
import './styles/main.scss';

export interface StudioProps {
  config: StudioConfig;
  logger?: ILogger;
  queryClient?: QueryClient;
}

export const Studio: FC<StudioProps> = ({ config, logger, queryClient }) => {
  return (
    <LoggingProvider
      logger={
        logger ||
        LoggerFactory({
          environment: 'production',
        })
      }
      options={{}}
    >
      <QueryClientProvider client={queryClient || new QueryClient()}>
        <ConfigProvider config={config}>
          <RouterBase />
        </ConfigProvider>
      </QueryClientProvider>
    </LoggingProvider>
  );
};
