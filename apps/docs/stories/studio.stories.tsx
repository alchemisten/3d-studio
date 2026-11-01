import type { Meta, StoryObj } from '@storybook/react';
import { createStaticAdapter } from '@schablone/3d-studio-core';
import { Studio } from '@schablone/3d-studio';

const adapter = createStaticAdapter([
  {
    id: 'spinning-box',
    name: 'Spinning box',
    description: 'Animated demo model with highlights.',
    source: './models/spinning-box/spinning-box.gltf',
    featureConfig: {
      highlights: {
        highlights: [
          { id: 'corner', label: 'Corner', anchor: { node: 'Box', offset: [0.5, 0.5, 0.5] }, camera: { position: [1.6, 1.2, 1.6] } },
        ],
      },
    },
  },
  { id: 'second', name: 'Second project', source: './models/spinning-box/spinning-box.gltf' },
]);

const meta: Meta<typeof Studio> = {
  title: 'Studio/Studio',
  component: Studio,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '100vh' }}><Story /></div>],
};
export default meta;

export const ListAndDetail: StoryObj<typeof Studio> = {
  args: {
    adapter,
    viewer: { draco: './draco/', canvasChildren: <ambientLight intensity={2} /> },
    slots: { 'project-list.header': <h1>Projects</h1> },
  },
};
