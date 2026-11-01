import { act, render, screen } from '@testing-library/react';
import { Slot, SlotProvider } from '@schablone/3d-studio-ui';
import { describe, expect, it } from 'vitest';
import { ViewerContext, ViewerStore } from '../store';
import { defineFeature, useFeatures } from './index';

const wire = defineFeature<{ enabled: boolean }>({
  id: 'wire',
  defaults: { enabled: true },
  toggle: { label: 'Wire' },
});

const Harness = () => {
  useFeatures([wire], undefined);
  return (
    <div role="menu">
      <Slot name="viewer.options" />
    </div>
  );
};

describe('toggle features', () => {
  it('shows a checkbox after load, seeded from config, and updates the store', () => {
    const store = new ViewerStore();
    render(
      <SlotProvider>
        <ViewerContext.Provider value={store}>
          <Harness />
        </ViewerContext.Provider>
      </SlotProvider>,
    );
    expect(screen.queryByRole('menuitemcheckbox')).toBeNull();

    act(() => store.setState({ gltf: { parser: { json: {} } } as never }));
    const item = screen.getByRole('menuitemcheckbox', { name: /Wire/ });
    expect(item.getAttribute('aria-checked')).toBe('true');

    act(() => item.click());
    expect(store.getState().featureEnabled.wire).toBe(false);
    expect(screen.getByRole('menuitemcheckbox').getAttribute('aria-checked')).toBe('false');
  });
});
