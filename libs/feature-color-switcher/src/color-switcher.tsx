import './color-switcher.css';
import { choiceSetting, defineFeature, useViewer, useViewerState, type ToolSurface } from '@schablone/3d-studio-core';
import { MenuGroup, MenuRadioItem } from '@schablone/3d-studio-ui';
import { tintMaterials } from './tint-materials';

export interface ColorSwitcherConfig {
  label: string;
  materials: string[];
  colors: { id: string; label: string; color: string }[];
}

const Options = ({ id, config, surface }: { id: string; config: ColorSwitcherConfig; surface: ToolSurface }) => {
  const viewer = useViewer();
  const current = useViewerState((state) => state.featureState[id] ?? 'original');
  const choices = [{ id: 'original', label: 'Original', color: '' }, ...config.colors];
  if (surface === 'inline')
    return (
      <fieldset className="ds-inline-tints">
        <legend>{config.label}</legend>
        {choices.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={current === option.id}
            onClick={() => viewer.setFeatureState(id, option.id)}
          >
            <span
              className="ds-model-swatch"
              aria-hidden="true"
              style={{ backgroundColor: option.color || undefined }}
            />
            {option.label}
          </button>
        ))}
      </fieldset>
    );
  return (
    <MenuGroup label={config.label}>
      {choices.map((option) => (
        <MenuRadioItem
          key={option.id}
          label={option.label}
          checked={current === option.id}
          icon={
            <span
              aria-hidden="true"
              className="ds-model-swatch"
              style={{ backgroundColor: option.color || undefined }}
            />
          }
          onSelect={() => viewer.setFeatureState(id, option.id)}
        />
      ))}
    </MenuGroup>
  );
};

export const createColorTool = (id: string) =>
  defineFeature<ColorSwitcherConfig>({
    id,
    defaults: { label: 'Body tint', materials: [], colors: [] },
    tools: ({ config, viewer }) => {
      const model = viewer.getState().gltf?.scene;
      const applicable = Boolean(model && config.colors.length && tintMaterials(model, config.materials).length);
      return [
        { id, available: () => applicable, render: (surface) => <Options id={id} config={config} surface={surface} /> },
      ];
    },
    querySettings: ({ viewer, config }) => viewer.getState().featureState[id] === undefined ? [] : [
      choiceSetting(id, config.colors.map(option => option.id), 'original',
        () => viewer.getState().featureState[id] as string, value => viewer.setFeatureState(id, value), true)],
    setup: ({ viewer, config }) => {
      const model = viewer.getState().gltf?.scene;
      if (!model || !config.colors.length) return;
      const bind = () =>
        tintMaterials(model, config.materials).map((material) => ({ material, original: material.color.clone() }));
      let paints = bind();
      if (viewer.getState().featureState[id] === undefined) viewer.setFeatureState(id, 'original');
      const restore = () => paints.forEach(({ material, original }) => material.color.copy(original));
      const apply = (selected: unknown) => {
        const swatch = config.colors.find((option) => option.id === selected);
        if (swatch) paints.forEach(({ material }) => material.color.set(swatch.color));
        else restore();
      };
      const sub = viewer.select$((state) => state.featureState[id]).subscribe(apply);
      const changes = viewer.on$('model:materials-changed').subscribe(({ gltf }) => {
        if (gltf.scene !== model) return;
        restore();
        paints = bind();
        apply(viewer.getState().featureState[id]);
      });
      return () => {
        sub.unsubscribe();
        changes.unsubscribe();
        restore();
      };
    },
  });

export const colorSwitcher = createColorTool('color-switcher');
