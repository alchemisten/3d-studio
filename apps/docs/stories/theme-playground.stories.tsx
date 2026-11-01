import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState, type ReactNode } from 'react';
import { Box, Layers, Palette, Play, Settings } from 'lucide-react';
import {
  Accordion,
  Badge,
  Button,
  Checkbox,
  ColorSelect,
  Field,
  IconButton,
  List,
  Loader,
  Menu,
  MenuCheckboxItem,
  Panel,
  Popover,
  ProgressBar,
  SegmentedControl,
  Select,
  Separator,
  Slider,
  Spinner,
  Stepper,
  Switch,
  Tabs,
  ThemeProvider,
  Toolbar,
  createTheme,
  type ThemeMode,
  type TokenOverrides,
} from '@schablone/3d-studio-ui';

const meta: Meta = { title: 'UI/Theme playground', parameters: { layout: 'fullscreen' } };
export default meta;

interface PlaygroundSettings {
  mode: ThemeMode;
  accent: string;
  radius: number;
  controlHeight: number;
  gap: number;
  inset: number;
  fontSize: number;
  panelPadding: number;
  iconButtonSize: number;
  surfaceOpacity: number;
}

const DEFAULTS: PlaygroundSettings = {
  mode: 'light',
  accent: '',
  radius: 8,
  controlHeight: 36,
  gap: 8,
  inset: 16,
  fontSize: 14,
  panelPadding: 12,
  iconButtonSize: 40,
  surfaceOpacity: 86,
};

const PRESETS: Array<{ name: string; settings: PlaygroundSettings }> = [
  { name: 'Default', settings: DEFAULTS },
  { name: 'Midnight', settings: { ...DEFAULTS, mode: 'dark', accent: '#00a3ff', radius: 10, surfaceOpacity: 80 } },
  { name: 'Forest', settings: { ...DEFAULTS, accent: '#16a34a', radius: 12, gap: 10, panelPadding: 14 } },
  { name: 'Sunset', settings: { ...DEFAULTS, mode: 'dark', accent: '#f59e0b', radius: 16, controlHeight: 40, iconButtonSize: 44, surfaceOpacity: 72 } },
  { name: 'Violet', settings: { ...DEFAULTS, accent: '#a855f7', radius: 20, controlHeight: 40, panelPadding: 16 } },
  { name: 'Compact', settings: { ...DEFAULTS, radius: 4, controlHeight: 30, iconButtonSize: 32, gap: 4, inset: 8, fontSize: 12, panelPadding: 8, surfaceOpacity: 94 } },
  { name: 'Mono', settings: { ...DEFAULTS, mode: 'dark', accent: '', radius: 0, surfaceOpacity: 92 } },
];

const toTokens = (s: PlaygroundSettings): TokenOverrides => ({
  ...(s.accent ? { 'color-accent': s.accent, 'color-focus': s.accent, 'color-accent-contrast': '#ffffff' } : {}),
  'radius-control': `${s.radius}px`,
  'radius-surface': `${s.radius + 4}px`,
  'control-height': `${s.controlHeight}px`,
  gap: `${s.gap}px`,
  'overlay-inset': `${s.inset}px`,
  'font-size-2': `${s.fontSize / 16}rem`,
  'panel-padding': `${s.panelPadding}px`,
  'icon-button-size': `${s.iconButtonSize}px`,
  'color-surface-overlay': `${s.mode === 'dark' ? 'rgb(20 23 29' : 'rgb(255 255 255'} / ${s.surfaceOpacity}%)`,
});

/** Only tokens that differ from the defaults end up in the generated code. */
const generate = (s: PlaygroundSettings) => {
  const defaults = toTokens(DEFAULTS);
  const changed = Object.entries(toTokens(s)).filter(([key, value]) => defaults[key as keyof TokenOverrides] !== value || (s.mode !== DEFAULTS.mode && key === 'color-surface-overlay'));
  const lines = changed.map(([key, value]) => `    '${key}': '${value}',`).join('\n');
  return `import { createTheme } from '@schablone/3d-studio-ui';

export const theme = createTheme({
  mode: '${s.mode}',
  tokens: {
${lines}
  },
});

// <Viewer theme={theme} … /> or <Studio theme={theme} … />`;
};

const SWATCHES = ['#2f6fed', '#00a3ff', '#16a34a', '#f59e0b', '#ef4444', '#a855f7', '#111827'];

const Row = ({ label, children }: { label: string; children: (id: string) => ReactNode }) => <Field label={label}>{children}</Field>;

const Showcase = () => {
  const [on, setOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [slider, setSlider] = useState(40);
  const [select, setSelect] = useState('orbit');
  const [segment, setSegment] = useState('shaded');
  const [step, setStep] = useState(1);
  const [color, setColor] = useState('#2f6fed');
  const [active, setActive] = useState('front');
  const [progress, setProgress] = useState(62);

  return (
    <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
      <Panel title="Buttons & icons">
        <div style={{ display: 'grid', gap: 12 }}>
          <Toolbar label="Icons">
            <IconButton label="Play" icon={<Play size={20} />} />
            <IconButton label="Layers" icon={<Layers size={20} />} active />
            <IconButton label="Disabled" icon={<Box size={20} />} disabled />
            <Menu label="Settings" icon={<Settings size={20} />}>
              <MenuCheckboxItem label="Wireframe" checked={on} onChange={setOn} />
              <MenuCheckboxItem label="Skybox" checked={checked} onChange={setChecked} />
            </Menu>
          </Toolbar>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button>Default</Button>
            <Button active>Active</Button>
            <Button variant="ghost">Ghost</Button>
            <Button loading>Saving</Button>
            <Button icon={<Palette size={16} />}>With icon</Button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge>Neutral</Badge>
            <Badge tone="accent">Accent</Badge>
            <Badge tone="danger">Danger</Badge>
            <Separator orientation="vertical" />
            <Spinner />
          </div>
        </div>
      </Panel>

      <Panel title="Form controls">
        <div style={{ display: 'grid', gap: 8 }}>
          <Row label="Switch">{(id) => <Switch id={id} label="Switch" checked={on} onCheckedChange={setOn} />}</Row>
          <Row label="Checkbox">{(id) => <Checkbox id={id} label="Checkbox" checked={checked} onCheckedChange={setChecked} />}</Row>
          <Row label="Slider">{() => <Slider label="Slider" value={slider} onValueChange={setSlider} />}</Row>
          <Row label="Select">
            {(id) => (
              <Select
                id={id}
                label="Camera"
                value={select}
                onValueChange={setSelect}
                options={[
                  { value: 'orbit', label: 'Orbit' },
                  { value: 'fly', label: 'Fly' },
                  { value: 'top', label: 'Top' },
                ]}
              />
            )}
          </Row>
          <Row label="Segmented">
            {() => (
              <SegmentedControl
                label="Shading"
                value={segment}
                onValueChange={setSegment}
                options={[
                  { value: 'shaded', label: 'Shaded' },
                  { value: 'wire', label: 'Wire' },
                  { value: 'xray', label: 'X-ray' },
                ]}
              />
            )}
          </Row>
          <Row label="Stepper">{() => <Stepper label="Speed" value={step} onValueChange={setStep} min={0.25} max={4} step={0.25} format={(v) => `${v}×`} />}</Row>
          <Field label="Color" orientation="vertical">{() => <ColorSelect label="Background" value={color} onValueChange={setColor} colors={SWATCHES} custom />}</Field>
        </div>
      </Panel>

      <Panel title="Navigation">
        <Tabs
          label="Sections"
          items={[
            { value: 'views', label: 'Views', content: <List label="Views" activeId={active} onSelect={(item) => setActive(item.id)} items={[
              { id: 'front', label: 'Front', description: 'Default camera', icon: <Box size={18} /> },
              { id: 'top', label: 'Top', color: '#16a34a' },
              { id: 'detail', label: 'Detail', image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Crect width='56' height='56' fill='%23a855f7'/%3E%3C/svg%3E" },
            ]} /> },
            { value: 'settings', label: 'Settings', content: <Accordion defaultOpen={['light']} sections={[
              { value: 'light', title: 'Lighting', content: <Slider label="Intensity" value={slider} onValueChange={setSlider} /> },
              { value: 'camera', title: 'Camera', content: 'Camera options' },
            ]} /> },
          ]}
        />
      </Panel>

      <Panel title="Loading">
        <div style={{ display: 'grid', gap: 16 }}>
          <ProgressBar label="Progress" value={progress} />
          <ProgressBar label="Indeterminate" value={null} />
          <Loader progress={progress} title="Loading model" detail={`${((progress / 100) * 30).toFixed(1)} / 30 MB`} />
          <Slider label="Simulated progress" value={progress} onValueChange={setProgress} />
        </div>
      </Panel>

      <Panel title="Popover & menu">
        <Popover trigger={<Button>Open popover</Button>}>
          <div style={{ padding: 8 }}>Popover content</div>
        </Popover>
      </Panel>
    </div>
  );
};

const Playground = () => {
  const [s, setS] = useState<PlaygroundSettings>(DEFAULTS);
  const [copied, setCopied] = useState(false);
  const set = <K extends keyof PlaygroundSettings>(key: K, value: PlaygroundSettings[K]) => setS((prev) => ({ ...prev, [key]: value }));
  const theme = useMemo(() => createTheme({ mode: s.mode, tokens: toTokens(s) }), [s]);
  const code = useMemo(() => generate(s), [s]);

  const slider = (key: keyof PlaygroundSettings, label: string, min: number, max: number, unit = '') => (
    <Field label={`${label}: ${s[key]}${unit}`} orientation="vertical">
      {() => <Slider label={label} min={min} max={max} value={s[key] as number} onValueChange={(v) => set(key, v as never)} />}
    </Field>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', minHeight: '100vh' }}>
      <ThemeProvider mode="light" style={{ display: 'block', boxSizing: 'border-box', padding: 16, borderRight: '1px solid var(--ds-color-border)', overflow: 'auto', maxHeight: '100vh', minWidth: 0 }}>
        <h3 style={{ marginTop: 0 }}>Theme playground</h3>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <Field label="Presets" orientation="vertical">
            {() => (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} data-testid="theme-presets">
                {PRESETS.map((preset) => (
                  <Button key={preset.name} active={JSON.stringify(preset.settings) === JSON.stringify(s)} onClick={() => setS(preset.settings)}>
                    {preset.name}
                  </Button>
                ))}
              </div>
            )}
          </Field>
          <Field label="Mode" orientation="vertical">
            {() => (
              <SegmentedControl
                label="Mode"
                value={s.mode}
                onValueChange={(v) => set('mode', v as ThemeMode)}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            )}
          </Field>
          <Field label="Accent" orientation="vertical">
            {() => <ColorSelect label="Accent (empty = neutral)" value={s.accent} onValueChange={(v) => set('accent', v)} colors={SWATCHES} custom />}
          </Field>
          {slider('radius', 'Corner radius', 0, 24, 'px')}
          {slider('controlHeight', 'Control height', 28, 56, 'px')}
          {slider('iconButtonSize', 'Icon button size', 28, 64, 'px')}
          {slider('gap', 'Gap', 2, 24, 'px')}
          {slider('inset', 'Overlay inset', 0, 40, 'px')}
          {slider('fontSize', 'Font size', 11, 20, 'px')}
          {slider('panelPadding', 'Panel padding', 4, 32, 'px')}
          {slider('surfaceOpacity', 'Surface opacity', 30, 100, '%')}
          <Button onClick={() => setS(DEFAULTS)}>Reset</Button>
          <Separator />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong>Generated code</strong>
              <Button
                onClick={async () => {
                  await navigator.clipboard?.writeText(code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <pre data-testid="theme-code" style={{ margin: 0, padding: 12, overflow: 'auto', fontSize: 12, borderRadius: 8, background: '#14171d', color: '#eceef2' }}>
              <code>{code}</code>
            </pre>
          </div>
        </div>
      </ThemeProvider>
      <ThemeProvider theme={theme} style={{ display: 'block', padding: 24, background: 'radial-gradient(circle at 15% 10%, #7dd3fc 0, transparent 40%), radial-gradient(circle at 85% 30%, #f9a8d4 0, transparent 40%), radial-gradient(circle at 40% 90%, #fde68a 0, transparent 45%), var(--ds-color-surface-raised)', color: 'var(--ds-color-text)', fontSize: 'var(--ds-font-size-2)' }}>
        <Showcase />
      </ThemeProvider>
    </div>
  );
};

export const ThemePlayground: StoryObj = { render: () => <Playground /> };
