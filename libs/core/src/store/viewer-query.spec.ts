import { expect, it, vi } from 'vitest';
import { ViewerStore, bindViewerQuery, choiceSetting } from './index';

it('hydrates and restores host keys without echoing navigation or unrelated state updates', () => {
  const viewer = new ViewerStore();
  let params = new URLSearchParams('finish=b&ref=abc');
  let navigate: (() => void) | undefined;
  const replace = vi.fn((next: URLSearchParams) => {
    params = next;
  });
  const write = (value: string | null) => viewer.setFeatureState('tint', value);
  const setting = choiceSetting(
    'tint',
    ['a', 'b'],
    'a',
    () => viewer.getState().featureState.tint as string,
    write,
    true,
  );
  const stop = bindViewerQuery(viewer, [{ featureId: 'paint', setting }], {
    read: () => params,
    replace,
    key: () => 'finish',
    subscribe: (listener) => {
      navigate = listener;
      return () => {
        navigate = undefined;
      };
    },
  });
  expect(viewer.getState().featureState.tint).toBe('b');
  viewer.setFeatureState('clock', 1);
  expect(replace).not.toHaveBeenCalled();
  write('a');
  expect(params.toString()).toBe('ref=abc');
  params.set('finish', 'b');
  navigate?.();
  expect(viewer.getState().featureState.tint).toBe('b');
  params.set('finish', 'unknown');
  navigate?.();
  expect(viewer.getState().featureState.tint).toBe('a');
  stop();
  write('b');
  expect(replace).toHaveBeenCalledTimes(1);
});
