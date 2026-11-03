import { ViewerContext, ViewerStore } from '@schablone/3d-studio-core';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAnimation } from './index';

describe('playback mode', () => {
  it('sets the viewer override and restores scene defaults', () => {
    const store = new ViewerStore();
    const { result } = renderHook(useAnimation, {
      wrapper: ({ children }) => <ViewerContext.Provider value={store}>{children}</ViewerContext.Provider>,
    });

    act(() => result.current.setLoop('pingpong'));
    expect(result.current.loopOverride).toBe('pingpong');

    act(() => result.current.setLoop());
    expect(result.current.loopOverride).toBeUndefined();
  });
});
