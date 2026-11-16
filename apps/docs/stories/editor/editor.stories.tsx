import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from 'lucide-react';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { PreviewLights } from '@schablone/3d-studio-core';
import {
  Editor,
  type EditorNav,
  editorNavFromSearch,
  editorNavToSearch,
  type EditorStatus,
  type EditorValue,
  highlightEditor,
  type LibraryMaterialInput,
  materialAssignment,
  parseEditorValue,
  sceneSettings,
} from '@schablone/3d-studio-feature-editor';
import { ambientOcclusion } from '@schablone/3d-studio-feature-ambient-occlusion';
import { Button, createTheme } from '@schablone/3d-studio-ui';
import { sampleFeatures } from '../../../samples/scenes';
import { variantsShoe } from '../../../samples/variants-shoe';
import { StoryScene } from '../shared/story-scene';
import './editor-story.css';

const library: LibraryMaterialInput[] = [
  { id: 'sage', name: 'Sage', meta: 'RAL 6021', group: 'Matte', material: { baseColor: '#83ab91', roughness: 0.9 } },
  { id: 'ochre', name: 'Ochre', meta: 'RAL 1024', group: 'Satin', material: { baseColor: '#dda85d', roughness: 0.55 } },
  {
    id: 'slate',
    name: 'Slate blue',
    meta: 'RAL 5014',
    group: 'Satin',
    material: { baseColor: '#7095b5', roughness: 0.5 },
  },
  {
    id: 'signal',
    name: 'Signal blue',
    meta: 'RAL 5005',
    group: 'Satin',
    material: { baseColor: '#00457d', roughness: 0.45 },
  },
  {
    id: 'red',
    name: 'Signal red',
    meta: 'RAL 3001',
    group: 'Satin',
    material: { baseColor: '#cc0033', roughness: 0.5 },
  },
  {
    id: 'chrome',
    name: 'Chrome',
    meta: 'Polished',
    group: 'Metal',
    material: { baseColor: '#d9dde2', roughness: 0.12, metalness: 1 },
  },
  { id: 'rubber', name: 'Rubber', meta: 'Black', group: 'Matte', material: { baseColor: '#1c1d1f', roughness: 1 } },
];

const features = [...sampleFeatures, ambientOcclusion];

const tools = [materialAssignment.use({ library }), highlightEditor.use({ locales: ['de', 'en'] }), sceneSettings];

const upperText = [
  'Choose a **finish** and tint its texture:',
  '',
  '- three authored variants',
  '- a tint on top',
  '',
  '::action[Midnight]{type="variant" name="midnight"}',
  '',
  '::action{id="body-tint" type="tool"}',
  '',
  '::action[Next highlight]{type="highlight" target="next"}',
].join('\n');

const sampleHighlights = (variantsShoe.featureConfig?.highlights as { highlights: { id: string }[] }).highlights.map(
  (highlight) =>
    highlight.id === 'upper' ? { ...highlight, description: { de: upperText, en: upperText } } : highlight,
);

const initial = parseEditorValue({
  featureConfig: { ...variantsShoe.featureConfig, highlights: { highlights: sampleHighlights } },
  openingCamera: variantsShoe.openingCamera,
});

const hostTabs = [
  {
    id: 'model',
    label: 'Model',
    icon: <Box size={18} aria-hidden="true" />,
    panel: (
      <div className="editor-story__host-panel">
        <h3>{variantsShoe.name}</h3>
        <p>{variantsShoe.description}</p>
        <p>This tab belongs to the host application: any React content can sit beside the editor's own tabs.</p>
      </div>
    ),
  },
];

const tabOrder = ['model', 'materials', 'highlights', 'settings'];

const brandTheme = createTheme({
  mode: 'light',
  tokens: {
    'font-family-base': 'Roboto, system-ui, sans-serif',
    'color-text': '#ffffff',
    'color-text-muted': '#d5e1ec',
    'color-surface-overlay': '#00457d',
    'color-accent': '#cc0033',
    'color-accent-contrast': '#ffffff',
    'color-focus': '#cc0033',
    'glass-bg': '#00457d',
    'glass-hover': '#0d2d5e',
    'glass-border': '#00457d',
    'glass-edge': 'transparent',
    'glass-highlight': 'transparent',
    'glass-blur': '0',
    'radius-control': '0',
    'radius-surface': '0',
  },
});

const brandStyle = {
  '--ds-editor-font': 'Roboto, system-ui, sans-serif',
  '--ds-editor-text': '#666666',
  '--ds-editor-text-muted': '#8a8a8a',
  '--ds-editor-bg': '#ffffff',
  '--ds-editor-panel-bg': '#f3f6f9',
  '--ds-editor-control-bg': '#ffffff',
  '--ds-editor-line': '#e0e0e0',
  '--ds-editor-primary': '#00457d',
  '--ds-editor-primary-hover': '#0d2d5e',
  '--ds-editor-primary-contrast': '#ffffff',
  '--ds-editor-accent': '#cc0033',
  '--ds-editor-handle-contrast': '#ffffff',
  '--ds-editor-radius': '0',
} as CSSProperties;

const SAVE_MS = 500;

interface EditorStoryProps {
  locale: 'de' | 'en';
  brand: boolean;
}

const EditorStory = ({ locale, brand }: EditorStoryProps) => {
  const [value, setValue] = useState<EditorValue>(initial);
  const [nav, setNav] = useState<EditorNav>(() => editorNavFromSearch(window.location.search, 'e.'));
  const [status, setStatus] = useState<EditorStatus>('saved');
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div className="editor-story">
      <Editor
        source={variantsShoe.source}
        draco="./draco/"
        features={features}
        tools={tools}
        tabs={hostTabs}
        tabOrder={tabOrder}
        canvasChildren={<PreviewLights />}
        locale={locale}
        value={value}
        onChange={(next) => {
          setValue(next);
          setStatus('saving');
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setStatus('saved'), SAVE_MS);
        }}
        nav={nav}
        onNavChange={(next) => {
          setNav(next);
          window.history.replaceState(null, '', `?${editorNavToSearch(next, window.location.search, 'e.')}`);
        }}
        status={status}
        style={brand ? brandStyle : undefined}
        viewerTheme={brand ? brandTheme : undefined}
        start={<strong>{variantsShoe.name}</strong>}
        end={<Button active>Publish</Button>}
      />
    </div>
  );
};

const meta = {
  title: 'Features/Editor',
  component: EditorStory,
  args: { locale: 'en', brand: false },
  argTypes: { locale: { control: 'inline-radio', options: ['de', 'en'] }, brand: { control: 'boolean' } },
} satisfies Meta<typeof EditorStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Editing: Story = {};
export const German: Story = { args: { locale: 'de' } };
export const Branded: Story = { args: { locale: 'de', brand: true } };

const ViewerPreview = ({ locale }: { locale: 'de' | 'en' }) => (
  <div className="editor-story">
    <StoryScene
      scene={variantsShoe}
      locale={locale}
      featureConfig={{
        ...initial.featureConfig,
        highlights: { highlights: sampleHighlights, locale },
        'beauty-shot': { enabled: true, layout: 'quality', locale },
      }}
    />
  </div>
);

/** What a viewer makes of the authored value: Markdown, actions and localized chrome. */
export const Viewer: StoryObj<typeof ViewerPreview> = {
  render: (args) => <ViewerPreview {...args} />,
  args: { locale: 'de' },
};
