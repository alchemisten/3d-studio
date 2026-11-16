import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { type ReactNode, useState } from 'react';
import { Group, type Material, Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { defineFeature, type FeatureInput, ViewerContext, ViewerStore } from '@schablone/3d-studio-core';
import {
  defaultSettingsSections,
  type EditorChange,
  EditorHistoryButtons,
  type EditorNav,
  EditorProvider,
  EditorShell,
  type EditorValue,
  HighlightPanel,
  highlightsOf,
  MaterialPanel,
  SceneSettingsPanel,
  useEditor,
  useHighlightEditor,
} from './index';
import type { MaterialAssignmentConfig } from './materials/material-assignment-state';
import { useAssignedMaterials } from './materials/use-assigned-materials';

vi.stubGlobal(
  'ResizeObserver',
  class {
    public observe = () => undefined;
    public unobserve = () => undefined;
    public disconnect = () => undefined;
  },
);

type ViewerGltf = NonNullable<ReturnType<ViewerStore['getState']>['gltf']>;

interface HostProps {
  store: ViewerStore;
  onChange: (value: EditorValue, change: EditorChange) => void;
  onNavChange?: (nav: EditorNav) => void;
  initial?: EditorValue;
  features?: FeatureInput[];
  locale?: string;
  /** The panel under test, shown as the only sidebar tab. */
  tab: string;
  children: ReactNode;
}

const Host = ({ store, onChange, onNavChange, initial, features, locale, tab, children }: HostProps) => {
  const [value, setValue] = useState<EditorValue>(initial ?? { featureConfig: {}, materials: {} });
  return (
    <EditorProvider
      value={value}
      store={store}
      features={features}
      locale={locale}
      onChange={(next, change) => {
        setValue(next);
        onChange(next, change);
      }}
    >
      <EditorShell
        actions={<EditorHistoryButtons />}
        onNavChange={onNavChange}
        tabs={[
          { id: tab, label: tab, panel: <ViewerContext.Provider value={store}>{children}</ViewerContext.Provider> },
        ]}
      />
    </EditorProvider>
  );
};

const lastValue = (onChange: ReturnType<typeof vi.fn>): EditorValue => onChange.mock.calls.at(-1)?.[0];

const loadScene = (store: ViewerStore) => {
  const door = new Mesh(undefined, new MeshStandardMaterial({ name: 'Paint', color: '#ff0000' }));
  door.name = 'Door';
  const handle = new Mesh(undefined, new MeshStandardMaterial({ name: 'Chrome', color: '#cccccc' }));
  handle.name = 'Handle';
  const hinge = new Mesh(undefined, new MeshStandardMaterial({ name: 'Chrome', color: '#cccccc' }));
  hinge.name = 'Hinge';
  const cabinet = new Group();
  cabinet.name = 'Cabinet';
  cabinet.add(door, handle, hinge);
  const scene = new Group();
  scene.name = 'Scene';
  scene.add(cabinet);
  store.setState({ status: 'ready', gltf: { scene, parser: { json: {} } } as unknown as ViewerGltf });
  return { door, handle, hinge };
};

const materialName = (mesh: Mesh) => (mesh.material as Material).name;

describe('EditorShell', () => {
  const tabs = [
    { id: 'model', label: 'Model', panel: <p>Host model panel</p> },
    { id: 'materials', label: 'materials.tool', panel: <p>Material panel</p> },
  ];

  it('shows host tabs in the sidebar and switches between them', () => {
    const onNavChange = vi.fn();
    render(<EditorShell label="Scene editor" tabs={tabs} status="saved" onNavChange={onNavChange} />);
    expect(screen.getByRole('region', { name: 'Scene editor' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Saved');
    const list = screen.getByRole('tablist', { name: 'Tools' });
    expect(within(list).getByRole('tab', { name: 'Model' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toBe('Host model panel');

    fireEvent.click(within(list).getByRole('tab', { name: 'Materials' }));
    expect(screen.getByRole('tabpanel').textContent).toBe('Material panel');
    expect(onNavChange).toHaveBeenLastCalledWith({ tool: 'materials' });

    fireEvent.keyDown(within(list).getByRole('tab', { name: 'Materials' }), { key: 'ArrowRight' });
    expect(onNavChange).toHaveBeenLastCalledWith({ tool: 'model' });
    expect(document.activeElement).toBe(within(list).getByRole('tab', { name: 'Model' }));
  });

  it('collapses to the tab strip and expands when a tab is chosen', () => {
    const onNavChange = vi.fn();
    render(<EditorShell tabs={tabs} tabOrder={['materials', 'model']} onNavChange={onNavChange} />);
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Materials', 'Model']);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(onNavChange).toHaveBeenLastCalledWith({ tool: 'materials', collapsed: true });
    expect(screen.queryByRole('tabpanel')).toBeNull();
    expect(screen.getByRole('tablist').getAttribute('aria-orientation')).toBe('vertical');
    fireEvent.click(screen.getByRole('tab', { name: 'Model' }));
    expect(onNavChange).toHaveBeenLastCalledWith({ tool: 'model' });
    expect(screen.getByRole('tabpanel').textContent).toBe('Host model panel');
  });

  it('follows a controlled nav', () => {
    const { rerender } = render(<EditorShell tabs={tabs} nav={{ tool: 'materials' }} />);
    expect(screen.getByRole('tabpanel').textContent).toBe('Material panel');
    fireEvent.click(screen.getByRole('tab', { name: 'Model' }));
    expect(screen.getByRole('tabpanel').textContent).toBe('Material panel');
    rerender(<EditorShell tabs={tabs} nav={{ tool: 'model', collapsed: true }} />);
    expect(screen.queryByRole('tabpanel')).toBeNull();
  });

  it('resizes the sidebar with the keyboard', () => {
    render(<EditorShell tabs={tabs} />);
    const separator = screen.getByRole('separator', { name: 'Resize sidebar' });
    const before = Number(separator.getAttribute('aria-valuenow'));
    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    expect(Number(separator.getAttribute('aria-valuenow'))).toBe(before + 16);
  });
});

describe('highlight tab', () => {
  const config = { locales: ['de', 'en'] };
  const AddAt = () => {
    const editor = useHighlightEditor(config);
    return (
      <button type="button" onClick={() => editor.addAt([1, 2, 3], [0, 1, 0])}>
        click model
      </button>
    );
  };
  const tree = (
    <>
      <HighlightPanel config={config} />
      <AddAt />
    </>
  );

  it('opens the detail of a new highlight and reports text edits once, on blur', () => {
    const store = new ViewerStore();
    const onChange = vi.fn();
    const onNavChange = vi.fn();
    const events: EditorChange[] = [];
    store.on$('editor:change').subscribe((change) => events.push(change));
    render(
      <Host store={store} onChange={onChange} onNavChange={onNavChange} tab="highlights">
        {tree}
      </Host>,
    );
    expect(screen.getByRole('status').textContent).toMatch(/^No highlights yet/);
    expect(screen.getByTestId('ds-highlight-add').getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByText('click model'));
    expect(highlightsOf(lastValue(onChange))).toEqual([
      { id: 'highlight-1', label: { de: 'Highlight 1' }, anchor: { position: [1, 2, 3] }, normal: [0, 1, 0] },
    ]);
    expect(onNavChange).toHaveBeenLastCalledWith({ tool: 'highlights', highlight: 'highlight-1' });
    expect(screen.queryByTestId('ds-highlight-list')).toBeNull();
    const title = screen.getByTestId('ds-highlight-title') as HTMLInputElement;
    expect(document.activeElement).toBe(title);

    onChange.mockClear();
    fireEvent.change(title, { target: { value: 'G' } });
    fireEvent.change(title, { target: { value: 'Griff' } });
    expect(title.value).toBe('Griff');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(title);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(highlightsOf(lastValue(onChange))[0].label).toEqual({ de: 'Griff' });
    expect(events.map((event) => event.type)).toEqual(['highlights', 'highlights']);

    fireEvent.click(screen.getByTestId('ds-editor-undo'));
    expect(highlightsOf(lastValue(onChange))[0].label).toEqual({ de: 'Highlight 1' });
    fireEvent.click(screen.getByTestId('ds-editor-redo'));
    expect(highlightsOf(lastValue(onChange))[0].label).toEqual({ de: 'Griff' });

    fireEvent.click(screen.getByTestId('ds-editor-back'));
    expect(onNavChange).toHaveBeenLastCalledWith({ tool: 'highlights' });
    expect(screen.getByRole('option').textContent).toBe('1Griff');
  });

  it('lifts the hotspot along the stored normal, attaches no part without a model and deletes', () => {
    const store = new ViewerStore();
    const onChange = vi.fn();
    render(
      <Host store={store} onChange={onChange} tab="highlights">
        {tree}
      </Host>,
    );
    fireEvent.click(screen.getByText('click model'));
    fireEvent.click(screen.getByRole('button', { name: 'Pointer' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Lift off the surface' }));
    const lifted = highlightsOf(lastValue(onChange))[0];
    expect(lifted.target).toEqual({ position: [1, 2, 3] });
    expect(lifted.anchor).toEqual({ position: [1, 2.08, 3] });
    expect(lifted.pointer).toBe(true);

    fireEvent.click(screen.getByTestId('ds-highlight-remove'));
    expect(highlightsOf(lastValue(onChange))).toEqual([]);
    expect(screen.getByTestId('ds-highlight-removed').textContent).toMatch(/Highlight 1/);
    fireEvent.click(within(screen.getByTestId('ds-highlight-removed')).getByRole('button', { name: 'Undo' }));
    expect(highlightsOf(lastValue(onChange))).toHaveLength(1);
    expect(screen.queryByTestId('ds-highlight-removed')).toBeNull();
  });

  it('edits the actions of the text as a list, in sync with the rich text', () => {
    const store = new ViewerStore();
    const onChange = vi.fn();
    render(
      <Host store={store} onChange={onChange} tab="highlights">
        {tree}
      </Host>,
    );
    fireEvent.click(screen.getByText('click model'));
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByText('No actions in this text.')).toBeTruthy();

    fireEvent.click(screen.getByTestId('ds-highlight-action-add'));
    const description = () => highlightsOf(lastValue(onChange))[0].description;
    expect(description()).toEqual({ de: '::action[Next highlight]{type="highlight" target="next"}' });
    expect(screen.getByTestId('ds-highlight-text').textContent).toContain('Next highlight');

    onChange.mockClear();
    const label = screen.getByTestId('ds-highlight-action-label-0');
    fireEvent.change(label, { target: { value: 'Weiter' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(label);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(description()).toEqual({ de: '::action[Weiter]{type="highlight" target="next"}' });
    expect(screen.getByTestId('ds-highlight-text').textContent).toContain('Weiter');

    fireEvent.click(screen.getByRole('button', { name: 'Remove “Go to highlight”' }));
    expect(highlightsOf(lastValue(onChange))[0].description).toBeUndefined();
  });

  it('reorders the list with the move buttons and speaks the locale of the editor', () => {
    const initial: EditorValue = {
      materials: {},
      featureConfig: {
        highlights: {
          highlights: [
            { id: 'a', label: 'Erstes', anchor: { position: [0, 0, 0] } },
            { id: 'b', label: 'Zweites', anchor: { position: [1, 0, 0] } },
          ],
        },
      },
    };
    const onChange = vi.fn();
    render(
      <Host store={new ViewerStore()} onChange={onChange} initial={initial} locale="de" tab="highlights">
        <HighlightPanel config={{ locales: ['de'] }} />
      </Host>,
    );
    expect(screen.getByRole('listbox', { name: 'Highlights' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Zweites nach oben' }));
    expect(highlightsOf(lastValue(onChange)).map((highlight) => highlight.id)).toEqual(['b', 'a']);
    fireEvent.keyDown(screen.getByTestId('ds-highlight-row-b'), { key: 'ArrowDown', altKey: true });
    expect(highlightsOf(lastValue(onChange)).map((highlight) => highlight.id)).toEqual(['a', 'b']);
    expect(screen.getByRole('button', { name: 'Highlight hinzufügen' })).toBeTruthy();
  });
});

describe('material tab', () => {
  const config: MaterialAssignmentConfig = {
    library: [
      { id: 'oak', name: 'Oak', meta: 'RAL 8001', group: 'Wood', material: { baseColor: '#8a5a2b' } },
      { id: 'steel', name: 'Steel', group: 'Metal', material: { metalness: 1 } },
    ],
  };

  const Tool = ({ library = config.library }: { library?: MaterialAssignmentConfig['library'] }) => {
    useAssignedMaterials({ ...config, library });
    return <MaterialPanel config={{ ...config, library, emptyAction: <a href="/materials">Open library</a> }} />;
  };

  it('selects a part, previews on hover and applies a material as one undoable edit', () => {
    const store = new ViewerStore();
    const { door, handle } = loadScene(store);
    const onChange = vi.fn();
    const onNavChange = vi.fn();
    const view = render(
      <Host store={store} onChange={onChange} onNavChange={onNavChange} tab="materials">
        <Tool />
      </Host>,
    );
    expect(screen.getAllByRole('treeitem').map((row) => row.getAttribute('aria-level'))).toEqual([
      '1',
      '2',
      '3',
      '3',
      '3',
    ]);

    fireEvent.click(screen.getByRole('treeitem', { name: /^Door/ }));
    expect(onNavChange).toHaveBeenLastCalledWith({ tool: 'materials', part: '0/0' });
    expect(screen.queryByRole('tree')).toBeNull();
    expect(screen.getByRole('heading', { name: '1 selected' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Original' }).getAttribute('aria-checked')).toBe('true');

    fireEvent.pointerEnter(screen.getByTestId('ds-editor-swatch-oak'));
    expect(materialName(door)).toBe('Oak');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByTestId('ds-editor-swatch-oak'), { key: 'Escape' });
    expect(materialName(door)).toBe('Paint');

    fireEvent.click(screen.getByTestId('ds-editor-swatch-oak'));
    expect(lastValue(onChange).materials).toEqual({ '0/0': 'oak' });
    expect(materialName(door)).toBe('Oak');
    expect(materialName(handle)).toBe('Chrome');
    expect(screen.getByRole('radio', { name: /^Oak/ }).getAttribute('aria-checked')).toBe('true');

    fireEvent.click(screen.getByTestId('ds-editor-undo'));
    expect(lastValue(onChange).materials).toEqual({});
    expect(materialName(door)).toBe('Paint');
    fireEvent.click(screen.getByTestId('ds-editor-redo'));

    fireEvent.click(screen.getByTestId('ds-editor-back'));
    expect(screen.getByRole('treeitem', { name: /^Door\s*Oak/ })).toBeTruthy();
    expect(screen.getByTestId('ds-editor-used-oak').textContent).toBe('Oak1');

    view.unmount();
    expect(materialName(door)).toBe('Paint');
  });

  it('multi-selects parts, also by original colour, and lets a group hand its material down', () => {
    const store = new ViewerStore();
    const { door, handle, hinge } = loadScene(store);
    const onChange = vi.fn();
    const onNavChange = vi.fn();
    render(
      <Host store={store} onChange={onChange} onNavChange={onNavChange} tab="materials">
        <Tool />
      </Host>,
    );
    fireEvent.click(screen.getByRole('treeitem', { name: /^Handle/ }), { ctrlKey: true });
    fireEvent.click(screen.getByRole('treeitem', { name: /^Door/ }), { ctrlKey: true });
    expect(onNavChange).toHaveBeenLastCalledWith({ tool: 'materials', part: '0/1,0/0', mode: 'pick-part' });
    expect(screen.getAllByRole('treeitem').filter((row) => row.getAttribute('aria-selected') === 'true')).toHaveLength(
      2,
    );

    fireEvent.click(within(screen.getByRole('treeitem', { name: /^Handle/ })).getByLabelText(/same original colour/));
    expect(onNavChange).toHaveBeenLastCalledWith({ tool: 'materials', part: '0/1,0/2', mode: 'pick-part' });

    fireEvent.click(screen.getByTestId('ds-editor-choose-material'));
    expect(screen.getByRole('heading', { name: '2 selected' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Metal' }));
    expect(screen.getAllByRole('radio').map((tile) => tile.textContent)).toEqual(['Original', 'Steel']);
    fireEvent.click(screen.getByTestId('ds-editor-swatch-steel'));
    expect(lastValue(onChange).materials).toEqual({ '0/1': 'steel', '0/2': 'steel' });
    expect([materialName(door), materialName(handle), materialName(hinge)]).toEqual(['Paint', 'Steel', 'Steel']);

    fireEvent.click(screen.getByTestId('ds-editor-back'));
    fireEvent.click(screen.getByRole('treeitem', { name: /^Cabinet/ }));
    fireEvent.click(screen.getByTestId('ds-editor-swatch-oak'));
    expect(materialName(door)).toBe('Oak');
    expect(materialName(handle)).toBe('Steel');
    fireEvent.click(screen.getByTestId('ds-editor-back'));
    expect(screen.getByRole('treeitem', { name: /^Door\s*Oak\s*inherited/ })).toBeTruthy();
    expect(screen.getByRole('treeitem', { name: /^Cabinet\s*mixed/ })).toBeTruthy();
  });

  it('filters the parts and offers the host action for an empty library', () => {
    const store = new ViewerStore();
    loadScene(store);
    render(
      <Host store={store} onChange={vi.fn()} tab="materials">
        <Tool library={[]} />
      </Host>,
    );
    fireEvent.change(screen.getByTestId('ds-editor-parts-filter'), { target: { value: 'hin' } });
    expect(screen.getAllByRole('treeitem').map((row) => row.textContent)).toEqual(['Scene', 'Cabinet', 'Hinge']);
    fireEvent.click(screen.getByRole('treeitem', { name: /^Hinge/ }));
    expect(screen.getByText('The material library is empty.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open library' })).toBeTruthy();
  });
});

describe('scene settings tab', () => {
  const rotation = defineFeature<{ enabled: boolean; speed: number }>({
    id: 'camera-rotation',
    defaults: { enabled: false, speed: 2 },
  });
  const floor = defineFeature<{ mode: string; color: string }>({
    id: 'floor',
    defaults: { mode: 'shadow', color: '#aaa7a2' },
  });
  const features = [rotation, floor.use({ color: '#101010' })];

  const ViewportConfig = () => <output>{JSON.stringify(useEditor().viewerFeatureConfig)}</output>;

  it('stores only overrides and keeps suppressed behaviour off in the viewport', () => {
    const store = new ViewerStore();
    loadScene(store);
    const onChange = vi.fn();
    render(
      <Host store={store} onChange={onChange} features={features} tab="settings">
        <SceneSettingsPanel config={{ sections: defaultSettingsSections, openingCamera: true }} />
        <ViewportConfig />
      </Host>,
    );
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'Opening view',
      'Camera rotation',
      'Floor',
    ]);

    fireEvent.click(screen.getByRole('switch', { name: 'Rotate automatically' }));
    expect(lastValue(onChange).featureConfig).toEqual({ 'camera-rotation': { enabled: true } });
    expect(store.getState().featureEnabled['camera-rotation']).toBeUndefined();
    const viewport = JSON.parse(screen.getByRole('status').textContent ?? '');
    expect(viewport['camera-rotation']).toEqual({ enabled: false });
    expect(viewport['beauty-shot']).toEqual({ locale: 'en' });

    fireEvent.click(screen.getByRole('radio', { name: 'Fast' }));
    expect(lastValue(onChange).featureConfig).toEqual({ 'camera-rotation': { enabled: true, speed: 4 } });
    fireEvent.click(screen.getByRole('radio', { name: 'Normal' }));
    expect(lastValue(onChange).featureConfig).toEqual({ 'camera-rotation': { enabled: true } });

    fireEvent.click(screen.getByRole('radio', { name: 'Matte' }));
    expect(lastValue(onChange).featureConfig.floor).toEqual({ mode: 'matte' });
    expect(store.getState().featureState.floor).toBe('matte');

    onChange.mockClear();
    const colour = screen.getByLabelText('Floor colour') as HTMLInputElement;
    expect(colour.value).toBe('#101010');
    fireEvent.change(colour, { target: { value: '#202020' } });
    fireEvent.change(colour, { target: { value: '#303030' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(colour);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(lastValue(onChange).featureConfig.floor).toEqual({ mode: 'matte', color: '#303030' });
  });

  it('undoes with the keyboard', () => {
    const store = new ViewerStore();
    loadScene(store);
    const onChange = vi.fn();
    render(
      <Host store={store} onChange={onChange} features={features} tab="settings">
        <SceneSettingsPanel config={{ sections: defaultSettingsSections, openingCamera: false }} />
      </Host>,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Matte' }));
    act(() => {
      fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    });
    expect(lastValue(onChange).featureConfig).toEqual({});
    act(() => {
      fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true, shiftKey: true });
    });
    expect(lastValue(onChange).featureConfig.floor).toEqual({ mode: 'matte' });
  });
});
