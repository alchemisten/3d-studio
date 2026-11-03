import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IconButton, Overlay, SlotProvider, ThemeProvider, useOverlay, type SlotFillsInput } from '../index';
import { useEffect } from 'react';

const Wrapper = ({ slots, children }: { slots?: SlotFillsInput; children: React.ReactNode }) => (
  <ThemeProvider>
    <SlotProvider slots={slots}>{children}</SlotProvider>
  </ThemeProvider>
);

describe('Overlay', () => {
  it('renders nothing for empty regions', () => {
    const { container } = render(<Overlay />, { wrapper: Wrapper });
    expect(container.querySelectorAll('.ds-overlay__region')).toHaveLength(0);
  });

  it('renders JSX region fills in order', () => {
    render(
      <Overlay>
        <Overlay.TopRight order={2}>
          <span>second</span>
        </Overlay.TopRight>
        <Overlay.TopRight order={1}>
          <span>first</span>
        </Overlay.TopRight>
      </Overlay>,
      { wrapper: Wrapper },
    );
    const region = document.querySelector('[data-region="top-right"]') as HTMLElement;
    expect(region.textContent).toBe('firstsecond');
  });

  it('supports static slots (SSR-safe) via provider props', () => {
    render(<Overlay />, { wrapper: ({ children }) => <Wrapper slots={{ 'overlay.bottom-left': <b>static</b> }}>{children}</Wrapper> });
    expect(document.querySelector('[data-region="bottom-left"]')?.textContent).toBe('static');
  });

  it('adds and removes items through the registry API', () => {
    let api!: ReturnType<typeof useOverlay>;
    const Grab = () => {
      api = useOverlay();
      useEffect(() => undefined, []);
      return null;
    };
    render(
      <Overlay>
        <Grab />
      </Overlay>,
      { wrapper: Wrapper },
    );
    let remove!: () => void;
    act(() => {
      remove = api.add('top-left', { id: 'x', label: 'Reset', icon: '↺', onClick: () => undefined });
    });
    expect(screen.getByRole('button', { name: 'Reset' })).toBeTruthy();
    act(() => remove());
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
  });

  it('overwrites an item when the id is re-added', () => {
    let api!: ReturnType<typeof useOverlay>;
    const Grab = () => {
      api = useOverlay();
      return null;
    };
    render(
      <Overlay>
        <Grab />
      </Overlay>,
      { wrapper: Wrapper },
    );
    act(() => {
      api.add('center', { id: 'a', content: <i>one</i> });
      api.add('center', { id: 'a', content: <i>two</i> });
    });
    expect(document.querySelector('[data-region="center"]')?.textContent).toBe('two');
  });

  it('IconButton exposes an accessible name', () => {
    render(<IconButton label="Zoom" icon="+" />, { wrapper: Wrapper });
    expect(screen.getByRole('button', { name: 'Zoom' })).toBeTruthy();
  });
});
