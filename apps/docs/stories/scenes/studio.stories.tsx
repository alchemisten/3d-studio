import type { Meta, StoryObj } from '@storybook/react-vite';
import { PreviewLights } from '@schablone/3d-studio-core';
import { Studio } from '@schablone/3d-studio';
import { sampleFeatures, sampleScenes } from '../../../samples/scenes';

const meta: Meta<typeof Studio> = {
  title: 'Studio/Scenes',
  component: Studio,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '100vh' }}><Story /></div>],
};
export default meta;

export const ListAndDetail: StoryObj<typeof Studio> = {
  args: {
    features: sampleFeatures,
    adapter: sampleScenes,
    viewer: { draco: './draco/', canvasChildren: <PreviewLights /> },

  },
};
