import type { Meta, StoryObj } from '@storybook/react-vite';
import { ar, type ArLocale } from '@schablone/3d-studio-feature-ar';
import { sampleFeatures } from '../../../samples/scenes';
import { variantsShoe } from '../../../samples/variants-shoe';
import { Example, StoryScene } from '../shared/story-scene';

const features = [...sampleFeatures, ar];

type Placement = 'output' | 'button';

const Ar = ({ locale, isLanding, placement }: { locale: ArLocale; isLanding: boolean; placement: Placement }) => (
  <Example
    title="View in AR"
    hint="Open the Output menu top right. A desktop hands over by QR code; a phone opens Quick Look or Scene Viewer."
  >
    <StoryScene
      key={`${locale}-${isLanding}-${placement}`}
      scene={variantsShoe}
      features={features}
      featureConfig={{
        ...variantsShoe.featureConfig,
        ar: {
          enabled: true,
          glb: variantsShoe.source,
          isLanding,
          landingUrl: window.location.href,
          locale,
          placement,
          slug: variantsShoe.id,
          stageUrl: new URL('.', window.location.href).toString(),
        },
      }}
    />
  </Example>
);
const meta = {
  title: 'Features/AR',
  component: Ar,
  args: { locale: 'en', isLanding: false, placement: 'output' },
  argTypes: {
    locale: { control: 'inline-radio', options: ['de', 'en'] },
    isLanding: { control: 'boolean' },
    placement: { control: 'inline-radio', options: ['output', 'button'] },
  },
} satisfies Meta<typeof Ar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const OutputMenu: Story = {};
export const Button: Story = { args: { placement: 'button' } };
export const Landing: Story = { args: { isLanding: true } };
export const German: Story = { args: { locale: 'de' } };
