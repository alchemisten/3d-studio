import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IconButton, Menu, MenuCheckboxItem, MenuRadioItem, Overlay, Panel, SlotProvider, ThemeProvider } from './index';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <SlotProvider>{children}</SlotProvider>
  </ThemeProvider>
);

describe('styling and test hooks', () => {
  it('exposes classes and test ids on menu parts', () => {
    render(
      <Menu label="Options" icon="⚙" testId="opts" items={[{ id: 'reset', label: 'Reset', onSelect: () => undefined }]}>
        <MenuCheckboxItem label="A" checked onChange={() => undefined} testId="opts-a" className="custom" />
        <MenuRadioItem label="B" checked={false} onSelect={() => undefined} testId="opts-b" />
      </Menu>,
      { wrapper: Wrapper },
    );
    const trigger = screen.getByTestId('opts');
    expect(trigger.classList.contains('ds-menu__trigger')).toBe(true);
    expect(trigger.querySelector('.ds-icon-button__icon')).toBeTruthy();

    fireEvent.click(trigger);
    expect(screen.getByTestId('opts-popup').getAttribute('role')).toBe('menu');
    expect(screen.getByTestId('opts-item-reset')).toBeTruthy();
    expect(screen.getByTestId('opts-a').className).toContain('ds-menu__item--checkbox');
    expect(screen.getByTestId('opts-a').className).toContain('custom');
    expect(screen.getByTestId('opts-b').className).toContain('ds-menu__item--radio');
  });

  it('exposes overlay and region hooks', () => {
    render(
      <Overlay>
        <Overlay.BottomLeft>
          <IconButton label="x" icon="x" />
        </Overlay.BottomLeft>
      </Overlay>,
      { wrapper: Wrapper },
    );
    expect(screen.getByTestId('ds-overlay')).toBeTruthy();
    const region = screen.getByTestId('ds-overlay-region-bottom-left');
    expect(region.className).toContain('ds-overlay__region--bottom-left');
  });

  it('passes data attributes through to panels', () => {
    render(<Panel title="T" actions={<button>close</button>} data-testid="panel" />, { wrapper: Wrapper });
    expect(screen.getByTestId('panel').querySelector('.ds-panel__actions')).toBeTruthy();
  });
});
