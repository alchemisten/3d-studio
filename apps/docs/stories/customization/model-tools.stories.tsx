import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { variantsShoe } from '../../../samples/variants-shoe';
import { milkTruck } from '../../../samples/milk-truck';
import { Example, StoryScene } from '../shared/story-scene';

export default { title: 'Features/Customization' } satisfies Meta;
export const VariantAndTint: StoryObj = {
  render: () => (
    <Example
      title="Two tools, one selection"
      hint="Select a finish and tint in Upper finish, then open Customize. Original restores the active variant’s material."
    >
      <StoryScene scene={variantsShoe} />
    </Example>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByTestId('ds-highlight-select-current', {}, { timeout: 20000 }));
    await userEvent.click(c.getByTestId('ds-highlight-select-entry-upper'));
    await userEvent.click(within(c.getByTestId('ds-highlight-detail')).getByRole('button', { name: 'Street' }));
  },
};
export const BodyPaint: StoryObj = {
  render: () => (
    <Example title="Tint a named material" hint="Choose a body tint. The wheels and glass keep their authored colors.">
      <StoryScene scene={milkTruck} />
    </Example>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByTestId('ds-model-tools', {}, { timeout: 20000 }));
    await userEvent.click(c.getByRole('menuitemradio', { name: 'Sage' }));
  },
};
