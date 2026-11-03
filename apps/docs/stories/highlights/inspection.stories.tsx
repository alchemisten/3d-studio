import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { milkTruck } from '../../../samples/milk-truck';
import { Example, StoryScene } from '../shared/story-scene';

export default { title: 'Features/Highlights' } satisfies Meta;
export const HoverAndSelection: StoryObj = {
  render: () => (
    <Example
      title="Follow a moving part"
      hint="Headlamp is selected. Hover or focus Front wheel to emphasize its marker, line and geometry while the animation continues."
    >
      <StoryScene scene={milkTruck} />
    </Example>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('ds-highlight-select-current', {}, { timeout: 20000 }));
    await userEvent.click(canvas.getByTestId('ds-highlight-select-entry-headlamp'));
    await userEvent.click(canvas.getByTestId('ds-highlight-select-current'));
    await userEvent.hover(canvas.getByTestId('ds-highlight-select-entry-wheel'));
  },
};
export const WheelInspection: StoryObj = {
  render: () => (
    <Example
      title="Inspect the wheel"
      hint="Freeze the wheel, replay the clip, or use the callout to inspect the headlamp. Drag the title to reposition it."
    >
      <StoryScene scene={milkTruck} />
    </Example>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByTestId('ds-highlight-select-current', {}, { timeout: 20000 }));
    await userEvent.click(c.getByTestId('ds-highlight-select-entry-wheel'));
  },
};
