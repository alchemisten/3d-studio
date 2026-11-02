import { act, render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ViewerContext, ViewerStore, useViewerState } from './index';

it('only rerenders when the selected value changes and follows changed selectors', () => {
  const viewer = new ViewerStore();
  const rendered = vi.fn();
  const Consumer = ({ id }: { id: string }) => {
    const value = useViewerState((state) => state.featureEnabled[id]);
    rendered(value);
    return null;
  };
  const tree = (id: string) => (
    <ViewerContext.Provider value={viewer}>
      <Consumer id={id} />
    </ViewerContext.Provider>
  );
  const ui = render(tree('a'));
  act(() => viewer.setFeatureEnabled('b', true));
  expect(rendered.mock.calls).toEqual([[undefined]]);
  ui.rerender(tree('b'));
  expect(rendered).toHaveBeenLastCalledWith(true);
  act(() => viewer.setFeatureEnabled('b', false));
  expect(rendered).toHaveBeenLastCalledWith(false);
});
