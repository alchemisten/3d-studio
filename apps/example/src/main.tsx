import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createStaticAdapter } from '@schablone/3d-studio-core';
import { Studio } from '@schablone/3d-studio';
import '@schablone/3d-studio-ui';

// Swap for `createRestAdapter({ baseUrl: 'https://api.example.com' })` to load real projects.
const adapter = createStaticAdapter([
  {
    id: 'spinning-box',
    name: 'Spinning box',
    description: 'Animated demo with a node-attached highlight.',
    source: './models/spinning-box/spinning-box.gltf',
    featureConfig: {
      highlights: {
        highlights: [
          {
            id: 'corner',
            label: 'Corner',
            anchor: { node: 'Box', offset: [0.5, 0.5, 0.5] },
            camera: { position: [1.6, 1.2, 1.6] },
          },
        ],
      },
    },
  },
]);

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Studio adapter={adapter} viewer={{ draco: './draco/', canvasChildren: <ambientLight intensity={2} /> }} />
  </StrictMode>,
);
