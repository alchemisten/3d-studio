import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { LoggerFactory } from '@schablone/logging';

import { Studio } from './studio';

const logger = LoggerFactory({
  environment: 'local',
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <StrictMode>
    <Studio
      logger={logger}
      config={{
        baseUrl: 'http://127.0.0.1:4200/',
      }}
    />
  </StrictMode>
);
