import type { Meta, StoryObj } from '@storybook/react-vite';
import type { FloorMode } from '@schablone/3d-studio-feature-floor';
import { variantsShoe } from '../../../samples/variants-shoe';
import { Example, StoryScene } from '../shared/story-scene';

const Floor = ({ mode, color }: { mode: FloorMode; color: string }) => (
  <Example
    title="Ground the model"
    hint="Compare the contact shadow and the fading matte receiver under the same studio HDRI."
  >
    <StoryScene
      key={mode}
      scene={variantsShoe}
      featureConfig={{ ...variantsShoe.featureConfig, floor: { mode, color } }}
    />
  </Example>
);
const meta = {
  title: 'Features/Environment and floor',
  component: Floor,
  args: { mode: 'shadow', color: '#aaa7a2' },
  argTypes: { mode: { control: 'inline-radio', options: ['off', 'shadow', 'matte'] }, color: { control: 'color' } },
} satisfies Meta<typeof Floor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ShadowOnly: Story = {};
export const MatteFade: Story = { args: { mode: 'matte' } };
export const Floating: Story = { args: { mode: 'off' } };
