import { resolveFeatureConfig, ViewerContext, ViewerStore } from '@schablone/3d-studio-core';
import { Slot, SlotProvider, type SlotFillsInput } from '@schablone/3d-studio-ui';
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { animation } from './index';

describe('playback visibility', () => {
  it('hides and restores playback options, controls and scrubber with the feature toggle', () => {
    const viewer = new ViewerStore();
    const config = resolveFeatureConfig({ feature: animation });
    const slots = animation.slots as (ctx: { config: typeof config }) => SlotFillsInput;
    viewer.setFeatureState(animation.id, { clips: ['Walk'], status: {}, time: 0, duration: 1, clipTimes: {}, clipDurations: {} });
    viewer.setFeatureEnabled(animation.id, true);
    const view = render(
      <ViewerContext.Provider value={viewer}>
        <SlotProvider slots={slots({ config })}>
          <Slot name="viewer.options" />
          <Slot name="overlay.bottom-bar" />
          <Slot name="overlay.bottom-left" />
        </SlotProvider>
      </ViewerContext.Provider>,
    );
    const controls = () => [
      view.queryByRole('group', { name: 'Playback mode' }),
      view.queryByRole('slider', { name: 'Animation time' }),
      view.queryByRole('button', { name: 'Play' }),
    ].map(Boolean);

    expect(controls()).toEqual([true, true, true]);
    act(() => viewer.setFeatureEnabled(animation.id, false));
    expect(controls()).toEqual([false, false, false]);
    act(() => viewer.setFeatureEnabled(animation.id, true));
    expect(controls()).toEqual([true, true, true]);
  });
});
