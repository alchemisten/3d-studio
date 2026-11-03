import type { Meta, StoryObj } from '@storybook/react-vite';
import type { BeautyConfig } from '@schablone/3d-studio-feature-beauty-shot';
import { variantsShoe } from '../../../samples/variants-shoe';
import { Example, StoryScene } from '../shared/story-scene';

const Capture = ({ layout }: Pick<BeautyConfig, 'layout'>) => (
  <Example title="Beauty shot" hint="Orbit the shoe, then render the current view. Requires WebGPU.">
    <StoryScene
      key={layout}
      scene={variantsShoe}
      featureConfig={{ ...variantsShoe.featureConfig, 'beauty-shot': { enabled: true, layout } }}
    />
  </Example>
);
const meta = {
  title: 'Features/Beauty shot',
  component: Capture,
  args: { layout: 'quality' },
  argTypes: { layout: { control: 'radio', options: ['direct', 'quality', 'details'] } },
} satisfies Meta<typeof Capture>;
export default meta;
type Story = StoryObj<typeof meta>;
export const QualityPicker: Story = {};
export const OneClick: Story = { args: { layout: 'direct' } };
export const WithDetails: Story = { args: { layout: 'details' } };
