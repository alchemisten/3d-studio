import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { LoggerFactory } from '@schablone/logging';
import type { ViewerConfigModel } from '@alchemisten/3d-studio-viewer-core';
import './styles/main.scss';
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
        baseUrl: '',
        projectLoader: async (id, baseUrl) => {
          const projectData = await fetch(`${baseUrl}/api/projects/${id}`).then((response) => response.json());

          // TODO Mapping
          return projectData;
        },
      }}
    />
  </StrictMode>
);
