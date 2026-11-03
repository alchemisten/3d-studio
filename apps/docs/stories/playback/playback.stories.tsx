import type { Meta, StoryObj } from '@storybook/react-vite';
import { milkTruck } from '../../../samples/milk-truck';
import { Example, StoryScene } from '../shared/story-scene';
import type { AnimationConfig } from '@schablone/3d-studio-feature-animation';

const Playback = ({ loop, enabled }: { loop: AnimationConfig['loop']; enabled: boolean }) => (
  <Example
    title="Wheel playback"
    hint="Watch the timeline, seek to a pose, or switch playback mode in View settings. Highlights remain available with playback disabled."
  >
    <StoryScene
      key={loop + enabled}
      scene={milkTruck}
      featureConfig={{ ...milkTruck.featureConfig, animation: { loop, enabled } }}
    />
  </Example>
);
const meta = {
  title: 'Features/Playback',
  component: Playback,
  args: { loop: 'repeat', enabled: true },
  argTypes: { loop: { control: 'inline-radio', options: ['once', 'repeat', 'pingpong'] } },
} satisfies Meta<typeof Playback>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Repeat: Story = {};
export const PlayOnce: Story = { args: { loop: 'once' } };
export const PingPong: Story = { args: { loop: 'pingpong' } };
export const DisabledWithHighlights: Story = { args: { enabled: false } };
