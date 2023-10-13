import { FC } from 'react';
import { ILogger, LoggerFactory } from '@schablone/logging';
import { LoggingProvider } from '@schablone/logging-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ConfigProvider, StudioConfig } from './provider';
import { RouterBase } from './components';
import './styles/main.scss';

export interface StudioProps {
  /**
   * Configuration for the studio, including the base url for the API, custom
   * styles and a parser for the project data.
   */
  config: StudioConfig;
  /**
   * Logger that will be used throughout the application and passed to the
   * viewer. If no logger is provided, a default logger will be created
   * using the @schablone/logging package.
   */
  logger?: ILogger;
  /**
   * QueryClient that will be used throughout the application to cache API
   * calls. If no queryClient is provided, a default queryClient will be
   * created using the @tanstack/react-query package.
   */
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
