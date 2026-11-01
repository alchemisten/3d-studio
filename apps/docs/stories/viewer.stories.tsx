import type { Meta, StoryObj } from '@storybook/react-vite';
import { Viewer } from '@schablone/3d-studio-core';
import { IconButton, Overlay } from '@schablone/3d-studio-ui';
import { skybox } from '@schablone/3d-studio-feature-skybox';
import { wireframe } from '@schablone/3d-studio-feature-wireframe';
import { cameraRotation } from '@schablone/3d-studio-feature-camera-rotation';

const SOURCE = './models/milk-truck-draco/CesiumMilkTruck.gltf';

const meta: Meta<typeof Viewer> = {
  title: 'Core/Viewer',
  component: Viewer,
  decorators: [(Story) => <div style={{ height: '80vh' }}><Story /></div>],
  args: { source: SOURCE, draco: './draco/' },
};
export default meta;
type Story = StoryObj<typeof Viewer>;

export const Minimal: Story = {
  args: { canvasChildren: <ambientLight intensity={2} /> },
};

export const WithFeatures: Story = {
  args: {
    features: [
      skybox.use({ path: './environments/blurry', type: 'cube' }),
      wireframe,
      cameraRotation.use({ enabled: true, speed: 1 }),
    ],
  },
};

export const CustomOverlay: Story = {
  args: {
    canvasChildren: <ambientLight intensity={2} />,
    viewOptions: { region: 'top-left' },
    features: [wireframe],
    children: (
      <>
        <Overlay.BottomRight>
          <IconButton label="Share" icon="⤴" onClick={() => alert('share')} />
        </Overlay.BottomRight>
        <Overlay.BottomCenter>
          <IconButton label="Info" icon="ⓘ" />
        </Overlay.BottomCenter>
      </>
    ),
    slots: { 'viewer.loading': 'Fetching model…' },
  },
};
