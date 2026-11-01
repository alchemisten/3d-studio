import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconButton, Menu, MenuCheckboxItem, Overlay, Panel, SlotProvider, Toolbar, createTheme } from '@schablone/3d-studio-ui';
import { useState } from 'react';

const meta: Meta = { title: 'UI/Primitives' };
export default meta;

export const Buttons: StoryObj = {
  render: () => (
    <Toolbar label="Demo">
      <IconButton label="Home" icon="⌂" />
      <IconButton label="Active" icon="★" active />
      <IconButton label="Disabled" icon="✕" disabled />
    </Toolbar>
  ),
};

export const MenuWithToggles: StoryObj = {
  render: () => {
    const [wire, setWire] = useState(false);
    return (
      <div style={{ minHeight: 200 }}>
        <Menu label="View options" icon="⚙">
          <MenuCheckboxItem label="Wireframe" checked={wire} onChange={setWire} />
        </Menu>
      </div>
    );
  },
};

export const PanelExample: StoryObj = {
  render: () => (
    <Panel title="Details" actions={<IconButton label="Close" icon="×" tooltip={false} />}>
      Panel content
    </Panel>
  ),
};

export const OverlayRegions: StoryObj = {
  render: () => (
    <SlotProvider>
      <div style={{ position: 'relative', height: 420, background: 'var(--ds-color-surface-raised)' }}>
        <Overlay>
          <Overlay.TopLeft><IconButton label="Top left" icon="↖" /></Overlay.TopLeft>
          <Overlay.TopCenter><IconButton label="Top center" icon="↑" /></Overlay.TopCenter>
          <Overlay.TopRight order={2}><IconButton label="Second" icon="2" /></Overlay.TopRight>
          <Overlay.TopRight order={1}><IconButton label="First" icon="1" /></Overlay.TopRight>
          <Overlay.MiddleLeft><IconButton label="Middle left" icon="←" /></Overlay.MiddleLeft>
          <Overlay.Center><Panel title="Center">Any content</Panel></Overlay.Center>
          <Overlay.MiddleRight><IconButton label="Middle right" icon="→" /></Overlay.MiddleRight>
          <Overlay.BottomLeft><IconButton label="Bottom left" icon="↙" /></Overlay.BottomLeft>
          <Overlay.BottomCenter><Toolbar><IconButton label="A" icon="A" /><IconButton label="B" icon="B" /></Toolbar></Overlay.BottomCenter>
          <Overlay.BottomRight><IconButton label="Bottom right" icon="↘" /></Overlay.BottomRight>
        </Overlay>
      </div>
    </SlotProvider>
  ),
};

const brand = createTheme({
  mode: 'dark',
  tokens: { 'color-accent': '#ff8a00', 'icon-button-radius': '999px', 'icon-button-size': '3rem' },
});

export const Theming: StoryObj = {
  render: () => (
    <Toolbar label="Themed">
      <IconButton label="Default" icon="★" active />
      <div className="ds-theme" style={{ display: 'contents', ['--ds-color-accent' as string]: brand.tokens?.['color-accent'], ['--ds-icon-button-radius' as string]: '999px', ['--ds-icon-button-size' as string]: '3rem' }}>
        <IconButton label="Branded" icon="★" active />
      </div>
    </Toolbar>
  ),
};
