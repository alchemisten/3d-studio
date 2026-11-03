import { bodyPaint } from '../../../samples/sample-tints';
import { milkTruckHighlights } from '../../../samples/milk-truck';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Viewer } from '@schablone/3d-studio-core';
import { IconButton, Overlay } from '@schablone/3d-studio-ui';
import { skybox } from '@schablone/3d-studio-feature-skybox';
import { wireframe } from '@schablone/3d-studio-feature-wireframe';
import { lightScenarios } from '@schablone/3d-studio-feature-light-scenarios';
import { animation } from '@schablone/3d-studio-feature-animation';
import { highlights } from '@schablone/3d-studio-feature-highlights';
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

export const LightScenarios: Story = {
  args: {
    features: [
      lightScenarios.use({
        scenarios: [
          { id: 'neutral', label: 'Neutral', lights: [{ type: 'ambient', intensity: 1.5 }, { type: 'directional', position: [5, 5, 5], intensity: 2 }] },
          { id: 'warm', label: 'Warm', lights: [{ type: 'ambient', color: '#ffb36b', intensity: 1 }, { type: 'point', color: '#ff7a00', position: [-3, 2, 3], intensity: 60 }] },
          { id: 'cold', label: 'Cold', lights: [{ type: 'ambient', color: '#6bb5ff', intensity: 1 }, { type: 'spot', color: '#3d7bff', position: [3, 5, 2], intensity: 120, angle: 0.8, penumbra: 0.5 }] },
        ],
      }),
    ],
  },
};

export const Animation: Story = {
  args: {
    source: './models/spinning-box/spinning-box.gltf',
    canvasChildren: <ambientLight intensity={2} />,
    features: [animation.use({ loop: 'repeat' })],
  },
};

export const Highlights: Story = {
  args: {
    source: './models/spinning-box/spinning-box.gltf',
    canvasChildren: <ambientLight intensity={2} />,
    features: [
      animation.use({
        cues: [
          { id: 'look', time: 1.5 },
          { id: 'away', time: 2.5 },
        ],
      }),
      highlights.use({
        highlights: [
          {
            id: 'corner',
            label: 'Corner (attached to the node, follows the spin)',
            anchor: { node: 'Box', offset: [0.5, 0.5, 0.5] },
            target: { node: 'Box' },
            pointer: true,
            color: '#ff3d71',
            camera: { position: [1.6, 1.2, 1.6] },
            animation: { targetTime: 0, delay: 200 },
          },
          {
            id: 'fixed',
            label: 'Fixed marker (static in the world, only visible at 0-2 s)',
            kind: 'action',
            anchor: { position: [0, 1, 0] },
            camera: { position: [0, 2, 2], target: [0, 0, 0], fov: 35 },
            visibility: { from: 0, to: 2 },
            actions: [
              { id: 'pause', label: 'Pause', run: { pause: true } },
              { id: 'half', label: 'Jump to 1 s', run: { seek: 1 } },
            ],
          },
          {
            id: 'cued',
            label: 'Opened by the 1.5 s cue, closed by the 2.5 s cue',
            anchor: { position: [0, -1, 0] },
            camera: { position: [0, 0, 3], target: [0, 0, 0] },
            trigger: { cue: 'look', releaseCue: 'away' },
          },
        ],
      }),
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

export const MilkTruckHighlights: Story = {
  args: {
    features: [animation, bodyPaint, highlights.use(milkTruckHighlights)],
    canvasChildren: <ambientLight intensity={2} />,
  },
};