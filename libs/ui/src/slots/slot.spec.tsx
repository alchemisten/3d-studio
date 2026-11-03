import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Slot, SlotProvider, ThemeProvider, createTheme, mergeThemes, tokensToStyle } from '../index';

declare module './types' {
  interface SlotMap {
    'test.slot': { name: string };
  }
}

describe('Slot', () => {
  it('renders default children without fills', () => {
    render(
      <SlotProvider>
        <Slot name="test.slot">default</Slot>
      </SlotProvider>,
    );
    expect(screen.getByText('default')).toBeTruthy();
  });

  it('replace overrides default; prepend/append surround it', () => {
    const { container, rerender } = render(
      <SlotProvider>
        <Slot name="test.slot">default</Slot>
        <Slot.Fill name="test.slot" mode="prepend">
          [pre]
        </Slot.Fill>
        <Slot.Fill name="test.slot" mode="append">
          [post]
        </Slot.Fill>
      </SlotProvider>,
    );
    expect(container.textContent).toBe('[pre]default[post]');

    rerender(
      <SlotProvider>
        <Slot name="test.slot">default</Slot>
        <Slot.Fill name="test.slot" mode="replace">
          custom
        </Slot.Fill>
      </SlotProvider>,
    );
    expect(container.textContent).toBe('custom');
  });

  it('passes props to function fills', () => {
    render(
      <SlotProvider slots={{ 'test.slot': ({ name }) => <span>hi {name}</span> }}>
        <Slot name="test.slot" props={{ name: 'Ada' }} />
      </SlotProvider>,
    );
    expect(screen.getByText('hi Ada')).toBeTruthy();
  });

  it('throws outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Slot name="test.slot" />)).toThrow(/SlotProvider/);
    spy.mockRestore();
  });
});

describe('theme', () => {
  it('converts tokens to prefixed custom properties', () => {
    expect(tokensToStyle({ 'color-accent': 'red' })).toEqual({ '--ds-color-accent': 'red' });
  });

  it('merges themes left to right', () => {
    const a = createTheme({ mode: 'dark', tokens: { 'color-accent': 'red', 'space-1': '1px' } });
    const b = createTheme({ tokens: { 'color-accent': 'blue' } });
    expect(mergeThemes(a, b)).toEqual({ mode: 'dark', tokens: { 'color-accent': 'blue', 'space-1': '1px' } });
  });

  it('ThemeProvider applies tokens and inherits from parents', () => {
    render(
      <ThemeProvider theme={{ mode: 'dark', tokens: { 'color-accent': 'red' } }}>
        <ThemeProvider data-testid="inner" theme={{ tokens: { 'icon-button-size': '3rem' } }} />
      </ThemeProvider>,
    );
    const inner = screen.getByTestId('inner');
    expect(inner.getAttribute('data-ds-theme')).toBe('dark');
    expect(inner.style.getPropertyValue('--ds-color-accent')).toBe('red');
    expect(inner.style.getPropertyValue('--ds-icon-button-size')).toBe('3rem');
  });
});
