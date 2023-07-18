import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { LoggerFactory } from '@schablone/logging';
import { LoggingProvider } from '@schablone/logging-react';

import { RouterBase } from './components';

const logger = LoggerFactory({
  environment: 'local',
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <StrictMode>
    <LoggingProvider logger={logger} options={{}}>
      <RouterBase />
    </LoggingProvider>
  </StrictMode>
);
