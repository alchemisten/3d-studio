import {
  choiceSetting,
  defineFeature,
  useFeature,
  useQualityProbe,
  useViewer,
  useViewerState,
  type ViewerState,
} from '@schablone/3d-studio-core';
import { MenuGroup, MenuRadioItem } from '@schablone/3d-studio-ui';
import { resolveAmbientOcclusionLabels } from './ambient-occlusion-labels';
import {
  AMBIENT_OCCLUSION_ID,
  type AmbientOcclusionConfig,
  ambientOcclusionConfig,
  type AmbientOcclusionMode,
  ambientOcclusionModes,
  isAmbientOcclusionMode,
} from './config';
import { OcclusionLayer } from './occlusion-layer';
import { occlusionLevel } from './occlusion-level';

const modeOf = (state: ViewerState, fallback: AmbientOcclusionMode): AmbientOcclusionMode => {
  const mode = state.featureState[AMBIENT_OCCLUSION_ID];
  return isAmbientOcclusionMode(mode) ? mode : fallback;
};

const AmbientOcclusionScene = () => {
  const { config } = useFeature<AmbientOcclusionConfig>();
  const gltf = useViewerState((state) => state.gltf);
  const revision = useViewerState((state) => state.modelRevision);
  const mode = useViewerState((state) => modeOf(state, config.mode));
  const tier = useViewerState((state) => state.quality.tier);
  useQualityProbe(config.enabled && mode === 'auto');
  const level = occlusionLevel(config.enabled, mode, tier);
  return gltf && level !== 'off' ? (
    <OcclusionLayer
      model={gltf.scene}
      revision={revision}
      level={level}
      intensity={config.intensity}
      radius={config.radius}
      whenResting={config.whenResting && level !== 'high'}
    />
  ) : null;
};

const Options = ({ config }: { config: AmbientOcclusionConfig }) => {
  const viewer = useViewer();
  const mode = useViewerState((state) => modeOf(state, config.mode));
  const labels = resolveAmbientOcclusionLabels(config.locale, config.labels);
  return (
    <MenuGroup label={labels.title}>
      {ambientOcclusionModes.map((value) => (
        <MenuRadioItem
          key={value}
          className="ds-ambient-occlusion"
          testId={`ds-ambient-occlusion-${value}`}
          label={labels[value]}
          checked={mode === value}
          onSelect={() => viewer.setFeatureState(AMBIENT_OCCLUSION_ID, value)}
        />
      ))}
    </MenuGroup>
  );
};

/**
 * Ambient occlusion that darkens only the model and adapts to the device: `auto` follows `quality.tier`
 * of the viewer store, the view options offer Auto / On / Off. Usage: `ambientOcclusion.use({ intensity: 1.2 })`
 */
export const ambientOcclusion = defineFeature<AmbientOcclusionConfig>({
  id: AMBIENT_OCCLUSION_ID,
  config: ambientOcclusionConfig,
  scene: AmbientOcclusionScene,
  querySettings: ({ viewer, config }) =>
    config.enabled
      ? [
          choiceSetting(
            'ao',
            ambientOcclusionModes,
            config.mode,
            () => modeOf(viewer.getState(), config.mode),
            (value) => viewer.setFeatureState(AMBIENT_OCCLUSION_ID, value),
          ),
        ]
      : [],
  setup: ({ viewer, config }) => {
    if (viewer.getState().featureState[AMBIENT_OCCLUSION_ID] === undefined) {
      viewer.setFeatureState(AMBIENT_OCCLUSION_ID, config.mode);
    }
  },
  slots: ({ config }) =>
    config.enabled ? { 'viewer.options': { mode: 'append', order: 20, content: <Options config={config} /> } } : {},
});
