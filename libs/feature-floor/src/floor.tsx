import { choiceSetting, defineFeature, useFeature, useViewer, useViewerState } from '@schablone/3d-studio-core';
import { MenuGroup, MenuRadioItem } from '@schablone/3d-studio-ui';
import { FloorSurface, type FloorConfig, type FloorMode } from './floor-surface';

const labels = { off: 'Off', shadow: 'Shadow only', matte: 'Matte floor' };
export const isFloorMode = (value: unknown): value is FloorMode =>
  value === 'off' || value === 'shadow' || value === 'matte';

const FloorScene = () => {
  const { config } = useFeature<FloorConfig>();
  const gltf = useViewerState((s) => s.gltf);
  const mode = useViewerState((s) => s.featureState.floor as FloorMode | undefined) ?? config.mode;
  return gltf && mode !== 'off' ? (
    <FloorSurface model={gltf.scene} mode={mode} color={config.color} animated={gltf.animations.length > 0} />
  ) : null;
};

const Options = () => {
  const viewer = useViewer();
  const mode = useViewerState((s) => s.featureState.floor);
  return (
    <MenuGroup label="Floor">
      {(Object.keys(labels) as FloorMode[]).map((value) => (
        <MenuRadioItem
          key={value}
          label={labels[value]}
          checked={mode === value}
          onSelect={() => viewer.setFeatureState('floor', value)}
        />
      ))}
    </MenuGroup>
  );
};

export const floor = defineFeature<FloorConfig>({
  id: 'floor',
  defaults: { mode: 'shadow', color: '#aaa7a2' },
  scene: FloorScene,
  querySettings: ({ viewer, config }) => [choiceSetting('floor', Object.keys(labels), config.mode,
    () => viewer.getState().featureState.floor as FloorMode,
    value => viewer.setFeatureState('floor', value))],
  setup: ({ viewer, config }) => {
    if (viewer.getState().featureState.floor === undefined) viewer.setFeatureState('floor', config.mode);
  },
  slots: { 'viewer.options': { mode: 'append', order: 15, content: <Options /> } },
});
