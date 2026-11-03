import { createStaticAdapter } from '@schablone/3d-studio-core';

export const adapter = createStaticAdapter([
  {
    id: 'spinning-box',
    name: 'Spinning box',
    description: 'Animated demo with a node-attached highlight.',
    source: '/models/spinning-box/spinning-box.gltf',
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
