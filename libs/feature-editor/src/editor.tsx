import { useEffect, useMemo } from 'react';
import { CircleHelp, Redo2, Undo2 } from 'lucide-react';
import {
  type ViewerOptions as CoreViewerOptions,
  type FeatureInput,
  Viewer,
  type ViewerModelProps,
  type ViewerProps,
  type ViewerSourceProps,
  ViewerStore,
} from '@schablone/3d-studio-core';
import { IconButton, Popover, type Theme } from '@schablone/3d-studio-ui';
import { EditorProvider, type EditorProviderProps, useEditor } from './editor-context';
import { highlightEditor } from './highlights/highlight-editor';
import { materialAssignment } from './materials/material-assignment';
import { sceneSettings } from './settings/scene-settings';
import { EditorShell, type EditorShellProps } from './shell/editor-shell';
import { EditorSlots } from './shell/editor-tab';

type ViewerOptions = Omit<
  CoreViewerOptions,
  'featureConfig' | 'openingCamera' | 'features' | 'store' | 'theme' | 'className' | 'style' | 'children'
>;

type ShellOptions = Omit<EditorShellProps, 'children' | 'actions'>;

/** What the editor shows: a `source` it loads or a `model` the host owns, as on `<Viewer>`. */
type ViewerContent = ViewerSourceProps | ViewerModelProps;

export interface EditorOptions
  extends
    ViewerOptions,
    ShellOptions,
    Pick<EditorProviderProps, 'value' | 'onChange' | 'locale' | 'messages' | 'overrides'> {
  /** The viewer features of the edited scene. */
  features?: FeatureInput[];
  /** The editor features; each adds a sidebar tab. Defaults to materials, highlights and scene settings. */
  tools?: FeatureInput[];
  /** Bring your own store to tap into state and events, e.g. `editor:change`. */
  store?: ViewerStore;
  /** Theme of the viewer and its chrome inside the stage; the editor itself takes `theme`. */
  viewerTheme?: Theme;
  /** Overlay items of the viewer. */
  children?: ViewerProps['children'];
}

export type EditorProps = EditorOptions & ViewerContent;

/** The editor features that ship with the editor, in tab order. */
export const defaultEditorTools: FeatureInput[] = [materialAssignment, highlightEditor, sceneSettings];

const NO_FEATURES: FeatureInput[] = [];
const TEXT_TARGETS = 'input, textarea, select, [contenteditable="true"]';

/** Undo and redo buttons for the editor's top bar; Ctrl+Z and Ctrl+Shift+Z do the same. */
export const EditorHistoryButtons = () => {
  const { undo, redo, canUndo, canRedo, t } = useEditor();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as Element | null;
      const key = event.key.toLowerCase();
      if (!(event.ctrlKey || event.metaKey) || (key !== 'z' && key !== 'y') || target?.closest?.(TEXT_TARGETS)) return;
      if (target !== document.body && !target?.closest?.('.ds-editor')) return;
      event.preventDefault();
      if (key === 'y' || event.shiftKey) redo();
      else undo();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  return (
    <>
      <IconButton
        label={t('shell.undo')}
        icon={<Undo2 size={16} aria-hidden="true" />}
        disabled={!canUndo}
        data-testid="ds-editor-undo"
        onClick={undo}
      />
      <IconButton
        label={t('shell.redo')}
        icon={<Redo2 size={16} aria-hidden="true" />}
        disabled={!canRedo}
        data-testid="ds-editor-redo"
        onClick={redo}
      />
    </>
  );
};

const SHORTCUTS: readonly (readonly [keys: string, description: string])[] = [
  ['Esc', 'help.escape'],
  ['Del', 'help.delete'],
  ['[ ]  K J', 'help.step'],
  ['F', 'help.fly'],
  ['← ↑ → ↓', 'help.nudge'],
  ['Alt ↑ ↓', 'help.reorder'],
  ['Ctrl Z / Ctrl ⇧ Z', 'help.undo'],
  ['← ↑ → ↓ ⏎', 'help.grid'],
];

/** A "?" button for the editor's top bar that lists the keyboard shortcuts. */
export const EditorShortcutsHelp = () => {
  const { t } = useEditor();
  return (
    <Popover
      side="bottom"
      align="end"
      className="ds-editor-help"
      testId="ds-editor-help"
      trigger={
        <IconButton
          label={t('shell.help')}
          icon={<CircleHelp size={16} aria-hidden="true" />}
          data-testid="ds-editor-help-button"
        />
      }
    >
      <dl className="ds-editor-help__list">
        {SHORTCUTS.map(([keys, description]) => (
          <div key={description} className="ds-editor-help__row">
            <dt>
              <kbd>{keys}</kbd>
            </dt>
            <dd>{t(description)}</dd>
          </div>
        ))}
      </dl>
    </Popover>
  );
};

interface EditorFrameOptions extends ViewerOptions, ShellOptions {
  features: FeatureInput[];
  store: ViewerStore;
  viewerTheme?: Theme;
  children?: ViewerProps['children'];
}

type EditorFrameProps = EditorFrameOptions & ViewerContent;

const EditorFrame = ({
  features,
  store,
  viewerTheme,
  label,
  start,
  end,
  status,
  tabs,
  tabOrder,
  nav,
  defaultNav,
  onNavChange,
  theme,
  className,
  style,
  children,
  ...viewerProps
}: EditorFrameProps) => {
  const { value, viewerFeatureConfig, locale } = useEditor();
  return (
    <EditorShell
      label={label}
      start={start}
      actions={
        <>
          <EditorHistoryButtons />
          <EditorShortcutsHelp />
        </>
      }
      end={end}
      status={status}
      tabs={tabs}
      tabOrder={tabOrder}
      nav={nav}
      defaultNav={defaultNav}
      onNavChange={onNavChange}
      theme={theme}
      className={className}
      style={style}
    >
      <Viewer
        locale={locale}
        {...viewerProps}
        theme={viewerTheme}
        store={store}
        features={features}
        featureConfig={viewerFeatureConfig}
        openingCamera={value.openingCamera}
      >
        <EditorSlots />
        {children}
      </Viewer>
    </EditorShell>
  );
};

/**
 * A viewer in an editor shell: the tools are tabs of a sidebar beside the 3D stage. The editor features
 * edit `value` live in the viewer and report every finished edit through `onChange`; the host keeps the
 * value and stores it. Navigation (`nav`) is controllable and serializable.
 */
export const Editor = ({
  value,
  onChange,
  locale,
  messages,
  overrides,
  features = NO_FEATURES,
  tools = defaultEditorTools,
  store,
  ...rest
}: EditorProps) => {
  const viewerStore = useMemo(() => store ?? new ViewerStore(), [store]);
  const all = useMemo(() => [...features, ...tools], [features, tools]);

  return (
    <EditorProvider
      value={value}
      onChange={onChange}
      store={viewerStore}
      features={all}
      locale={locale}
      messages={messages}
      overrides={overrides}
    >
      <EditorFrame {...rest} features={all} store={viewerStore} />
    </EditorProvider>
  );
};
