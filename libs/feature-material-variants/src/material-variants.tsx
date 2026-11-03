import { useEffect, useState } from 'react';
import { choiceSetting, defineFeature, useFeature, useViewer, useViewerState, type ToolSurface } from '@schablone/3d-studio-core';
import { MenuGroup, MenuRadioItem } from '@schablone/3d-studio-ui';
import { bindVariantMaterials, variantNames } from './variant-materials';

const id = 'material-variant';

export interface VariantState {
  names: string[];
  selected: string | null;
}

interface VariantConfig {
  initial: string | null;
}

const Options = ({ surface, showDefault }: { surface: ToolSurface; showDefault: boolean }) => {
  const viewer = useViewer();
  const state = useViewerState((s) => s.featureState[id] as VariantState | undefined);
  if (!state) return null;
  const choices = showDefault ? [null, ...state.names] : state.names;
  const choose = (selected: string | null) => viewer.setFeatureState(id, { ...state, selected });
  const label = (name: string | null) => (name ? name[0].toUpperCase() + name.slice(1) : 'Asset default');
  return surface === 'menu' ? (
    <MenuGroup label="Variant">
      {choices.map((name) => (
        <MenuRadioItem
          key={name ?? ''}
          label={label(name)}
          checked={state.selected === name}
          onSelect={() => choose(name)}
        />
      ))}
    </MenuGroup>
  ) : (
    <fieldset className="ds-variant-options">
      <legend>Variant</legend>
      {choices.map((name) => (
        <button type="button" key={name ?? ''} aria-pressed={state.selected === name} onClick={() => choose(name)}>
          {label(name)}
        </button>
      ))}
    </fieldset>
  );
};

const Scene = () => {
  const { viewer } = useFeature<VariantConfig>();
  const gltf = useViewerState((s) => s.gltf);
  const [error, setError] = useState<Error>();
  useEffect(() => {
    if (!gltf || !variantNames(gltf).length) return;
    const binding = bindVariantMaterials(gltf, () => viewer.emit('model:materials-changed', { gltf }));
    let revision = 0;
    const sub = viewer
      .select$((s) => (s.featureState[id] as VariantState | undefined)?.selected)
      .subscribe((name) => {
        const request = ++revision;
        if (name === undefined) return;
        void binding.apply(name).catch((cause) => {
          if (request === revision) setError(new Error('Unable to load material variant ' + name, { cause }));
        });
      });
    return () => {
      revision++;
      sub.unsubscribe();
      binding.dispose();
    };
  }, [viewer, gltf]);
  if (error) throw error;
  return null;
};

export const materialVariants = defineFeature<VariantConfig>({
  id,
  defaults: { initial: null },
  scene: Scene,
  tools: ({ viewer, config }) => {
    const gltf = viewer.getState().gltf;
    const names = gltf ? variantNames(gltf) : [];
    const available = names.length > 0;
    return [
      {
        id,
        available: () => available,
        render: (surface) => (
          <Options surface={surface} showDefault={!config.initial || !names.includes(config.initial)} />
        ),
      },
    ];
  },
  querySettings: ({ viewer, config }) => {
    const state = viewer.getState().featureState[id] as VariantState | undefined;
    if (!state) return [];
    const fallback = config.initial && state.names.includes(config.initial) ? config.initial : null;
    return [choiceSetting('variant', state.names, fallback,
      () => (viewer.getState().featureState[id] as VariantState).selected,
      selected => viewer.setFeatureState(id, { ...state, selected }), true)];
  },
  setup: ({ viewer, config }) => {
    const gltf = viewer.getState().gltf;
    if (!gltf) return;
    const names = variantNames(gltf);
    if (names.length)
      viewer.setFeatureState(id, {
        names,
        selected: config.initial && names.includes(config.initial) ? config.initial : null,
      });
  },
});
