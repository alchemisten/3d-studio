import '../shared/story-scene.css';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconButton, Menu, MenuCheckboxItem, Overlay, Panel, SlotProvider, Toolbar, createTheme } from '@schablone/3d-studio-ui';
import { Eye, EyeOff, Pause, Play, RotateCcw, Settings, X } from 'lucide-react';
import { Button, MenuGroup, MenuRadioItem } from '@schablone/3d-studio-ui';
import { useState } from 'react';

const meta: Meta = { title: 'UI/Primitives' };
export default meta;

export const Buttons: StoryObj = {
  render: () => {
    const [playing, setPlaying] = useState(false);
    return <Toolbar label="Playback">
      <IconButton label={playing ? 'Pause' : 'Play'} icon={playing ? <Pause size={18}/> : <Play size={18}/>} active={playing} onClick={() => setPlaying(!playing)}/>
      <IconButton label="Stop" icon={<RotateCcw size={18}/>} disabled={!playing} onClick={() => setPlaying(false)}/>
    </Toolbar>;
  },
};

export const MenuWithToggles: StoryObj = {
  render: () => {
    const [wire, setWire] = useState(false);
    const [mode, setMode] = useState('Repeat');
    return <div className="studio-example__stage">
      <Menu label="View options" icon={<Settings size={18}/>}>
        <MenuCheckboxItem label="Wireframe" checked={wire} onChange={setWire}/>
        <MenuGroup label="Playback mode">{['Play once','Repeat','Ping-pong'].map(value=><MenuRadioItem key={value} label={value} checked={mode===value} onSelect={()=>setMode(value)}/>)}</MenuGroup>
      </Menu>
    </div>;
  },
};

export const PanelExample: StoryObj = {
  render: () => {
    const [open,setOpen]=useState(true);
    const [visible,setVisible]=useState(true);
    if (!open) return <Button onClick={()=>setOpen(true)}>Inspect front wheel</Button>;
    return <Panel title="Front wheel" actions={<IconButton label="Close" icon={<X size={18}/>} onClick={()=>setOpen(false)}/>}>
      <p>The marker follows a point on the rim as the wheel turns.</p>
      <Button icon={visible?<EyeOff size={16}/>:<Eye size={16}/>} onClick={()=>setVisible(!visible)}>{visible?'Hide marker':'Show marker'}</Button>
      {visible && <span aria-label="Wheel marker"> ②</span>}
    </Panel>;
  },
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
