import { SlidersHorizontal } from 'lucide-react';
import { defineFeature } from '@schablone/3d-studio-core';
import { useCameraBridge } from '../camera-bridge';
import { editorTabSlots } from '../shell/editor-tab';
import { sceneSettingsConfig, type SceneSettingsConfig } from './scene-settings-config';
import { SceneSettingsPanel } from './scene-settings-panel';

const SceneSettingsScene = () => {
  useCameraBridge();
  return null;
};

/**
 * Editor tab for the scene's presentation: the opening view and the settings of the viewer's features
 * (rotation, light, floor, background, wireframe, highlights, variants, colour choices, beauty shot).
 * Behaviour the editor suppresses in its viewport (see `runtimeOverrides`) is edited but not previewed.
 * Stores only the overrides of each feature and reports `{ type: 'feature-config' }` and
 * `{ type: 'opening-camera' }`. Usage: `sceneSettings.use({ sections: [...defaultSettingsSections, mine] })`.
 */
export const sceneSettings = defineFeature<SceneSettingsConfig>({
  id: 'scene-settings',
  config: sceneSettingsConfig,
  scene: SceneSettingsScene,
  slots: ({ config }) =>
    editorTabSlots({
      id: 'settings',
      label: 'settings.tool',
      icon: <SlidersHorizontal size={18} aria-hidden="true" />,
      order: 30,
      panel: <SceneSettingsPanel config={config} />,
    }),
});
