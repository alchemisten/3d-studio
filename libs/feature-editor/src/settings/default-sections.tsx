import type { SettingsContext, SettingsOption, SettingsSection } from './settings-section';
import { TintFields } from './tint-fields';

const ASSET_DEFAULT = 'default';

interface Labelled {
  id: string;
  label?: string | Record<string, string>;
}

const labelledOptions = (entries: unknown, locale: string): SettingsOption[] =>
  (Array.isArray(entries) ? (entries as Labelled[]) : []).map(({ id, label }) => ({
    value: id,
    label: typeof label === 'object' ? (label[locale] ?? Object.values(label)[0] ?? id) : (label ?? id),
  }));

const variantNames = ({ viewer }: SettingsContext): string[] =>
  (viewer.getState().featureState['material-variant'] as { names?: string[] } | undefined)?.names ?? [];

export const cameraRotationSection: SettingsSection = {
  featureId: 'camera-rotation',
  title: 'settings.rotation',
  fields: [
    {
      kind: 'switch',
      key: 'enabled',
      label: 'settings.rotation.enabled',
      apply: (viewer, value) => viewer.setFeatureEnabled('camera-rotation', value === true),
    },
    {
      kind: 'choice',
      presentation: 'segmented',
      key: 'speed',
      label: 'settings.rotation.speed',
      visible: ({ config }) => config.enabled === true,
      options: () => [
        { value: '1', label: 'settings.rotation.speed.slow' },
        { value: '2', label: 'settings.rotation.speed.normal' },
        { value: '4', label: 'settings.rotation.speed.fast' },
      ],
      toOption: (value) => String(value),
      fromOption: Number,
    },
  ],
};

export const floorSection: SettingsSection = {
  featureId: 'floor',
  title: 'settings.floor',
  fields: [
    {
      kind: 'choice',
      presentation: 'segmented',
      key: 'mode',
      label: 'settings.floor.mode',
      options: () => [
        { value: 'off', label: 'settings.floor.mode.off' },
        { value: 'shadow', label: 'settings.floor.mode.shadow' },
        { value: 'matte', label: 'settings.floor.mode.matte' },
      ],
      apply: (viewer, value) => viewer.setFeatureState('floor', value),
    },
    {
      kind: 'color',
      key: 'color',
      label: 'settings.floor.color',
      fallback: '#aaa7a2',
      visible: ({ config }) => config.mode === 'matte',
    },
  ],
};

export const lightScenariosSection: SettingsSection = {
  featureId: 'light-scenarios',
  title: 'settings.light',
  available: ({ config }) => Array.isArray(config.scenarios) && config.scenarios.length > 0,
  fields: [
    { kind: 'switch', key: 'enabled', label: 'settings.light.enabled' },
    {
      kind: 'choice',
      presentation: 'select',
      key: 'initial',
      label: 'settings.light.initial',
      options: ({ config, locale }) => labelledOptions(config.scenarios, locale),
      toOption: (value, { config }) =>
        typeof value === 'string' ? value : ((config.scenarios as Labelled[] | undefined)?.[0]?.id ?? ''),
      apply: (viewer, value) => viewer.setFeatureState('light-scenarios', value),
    },
  ],
};

export const skyboxSection: SettingsSection = {
  featureId: 'skybox',
  title: 'settings.skybox',
  fields: [
    { kind: 'text', key: 'path', label: 'settings.skybox.path', placeholder: 'https://' },
    { kind: 'switch', key: 'enabled', label: 'settings.skybox.enabled' },
    {
      kind: 'switch',
      key: 'useAsEnvironment',
      label: 'settings.skybox.environment',
      visible: ({ config }) => config.enabled === true,
    },
    {
      kind: 'slider',
      key: 'backgroundBlurriness',
      label: 'settings.skybox.blur',
      min: 0,
      max: 1,
      step: 0.05,
      visible: ({ config }) => config.enabled === true,
    },
  ],
};

export const wireframeSection: SettingsSection = {
  featureId: 'wireframe',
  title: 'settings.wireframe',
  fields: [
    {
      kind: 'switch',
      key: 'enabled',
      label: 'settings.wireframe.enabled',
      apply: (viewer, value) => viewer.setFeatureEnabled('wireframe', value === true),
    },
  ],
};

/**
 * Settings of a colour-switcher feature. The scene settings add it on their own for every feature of the
 * viewer whose defaults hold `materials` and `colors`; pass the id to place it yourself.
 */
export const tintSection = (featureId = 'color-switcher'): SettingsSection => ({
  featureId,
  title: 'settings.tints',
  fields: [{ kind: 'custom', key: 'tints', render: (props) => <TintFields {...props} /> }],
});

export const highlightsSection: SettingsSection = {
  featureId: 'highlights',
  title: 'settings.highlights',
  fields: [
    { kind: 'switch', key: 'enabled', label: 'settings.highlights.enabled' },
    { kind: 'switch', key: 'detail', label: 'settings.highlights.detail' },
  ],
};

export const materialVariantSection: SettingsSection = {
  featureId: 'material-variant',
  title: 'settings.variant',
  available: (context) => variantNames(context).length > 0,
  fields: [
    {
      kind: 'choice',
      presentation: 'select',
      key: 'initial',
      label: 'settings.variant.initial',
      options: (context) => [
        { value: ASSET_DEFAULT, label: 'settings.variant.default' },
        ...variantNames(context).map((name) => ({ value: name, label: name })),
      ],
      toOption: (value) => (typeof value === 'string' ? value : ASSET_DEFAULT),
      fromOption: (option) => (option === ASSET_DEFAULT ? null : option),
    },
  ],
};

export const ambientOcclusionSection: SettingsSection = {
  featureId: 'ambient-occlusion',
  title: 'settings.occlusion',
  fields: [
    { kind: 'switch', key: 'enabled', label: 'settings.occlusion.enabled' },
    {
      kind: 'choice',
      presentation: 'segmented',
      key: 'mode',
      label: 'settings.occlusion.mode',
      visible: ({ config }) => config.enabled === true,
      options: () => [
        { value: 'auto', label: 'settings.occlusion.mode.auto' },
        { value: 'on', label: 'settings.occlusion.mode.on' },
        { value: 'off', label: 'settings.occlusion.mode.off' },
      ],
      apply: (viewer, value) => viewer.setFeatureState('ambient-occlusion', value),
    },
    {
      kind: 'slider',
      key: 'intensity',
      label: 'settings.occlusion.intensity',
      min: 0,
      max: 2,
      step: 0.05,
      visible: ({ config }) => config.enabled === true,
    },
    {
      kind: 'slider',
      key: 'radius',
      label: 'settings.occlusion.radius',
      min: 0.01,
      max: 0.2,
      step: 0.01,
      visible: ({ config }) => config.enabled === true,
    },
    {
      kind: 'switch',
      key: 'whenResting',
      label: 'settings.occlusion.whenResting',
      visible: ({ config }) => config.enabled === true,
    },
  ],
};

export const beautyShotSection: SettingsSection = {
  featureId: 'beauty-shot',
  title: 'settings.beauty',
  fields: [
    { kind: 'switch', key: 'enabled', label: 'settings.beauty.enabled' },
    {
      kind: 'choice',
      presentation: 'select',
      key: 'initial',
      label: 'settings.beauty.initial',
      visible: ({ config }) => config.enabled === true,
      options: ({ config, locale }) => labelledOptions(config.presets, locale),
    },
  ],
};

/** The sections for the features shipped with 3D Studio, in panel order. */
export const defaultSettingsSections: SettingsSection[] = [
  cameraRotationSection,
  lightScenariosSection,
  floorSection,
  ambientOcclusionSection,
  skyboxSection,
  wireframeSection,
  highlightsSection,
  materialVariantSection,
  beautyShotSection,
];
