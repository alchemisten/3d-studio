import type { ComponentType, ReactNode } from 'react';
import type { OverlayApi, SlotFillsInput } from '@schablone/3d-studio-ui';
import type { ModelTool } from './model-tools';
import type { QuerySetting, ViewerStore } from '../store';

/** Anything with a `parse` method works, including zod schemas. */
export interface ConfigSchema<C> {
  parse(input: unknown): C;
}

export interface FeatureContext<C> {
  id: string;
  /** Resolved, validated config (props > adapter > glTF extension > defaults). */
  config: C;
  viewer: ViewerStore;
  overlay: OverlayApi;
}

export interface FeatureDefinition<C extends object = Record<string, never>> {
  id: string;
  /** Validates the merged config. Omit to accept it as-is. */
  config?: ConfigSchema<C>;
  defaults?: Partial<C>;
  /** Name of the glTF extension this feature reads its config from (root `extensions`). */
  gltf?: { extension: string };
  /** Makes the feature user-toggleable via the shared 'View options' menu. Initial state comes from `config.enabled`. */
  toggle?: { label: string; icon?: ReactNode; order?: number };
  /** Rendered inside the `<Canvas>`. Use `useFeature()` to read config. */
  scene?: ComponentType;
  /** Fills for slots anywhere in the viewer (overlay regions, `viewer.loading`, ...). */
  querySettings?: (ctx: FeatureContext<C>) => readonly QuerySetting[];
  tools?: (ctx: FeatureContext<C>) => readonly ModelTool[];
  slots?: SlotFillsInput | ((ctx: FeatureContext<C>) => SlotFillsInput);
  /** Runs once the model is ready and the config is resolved. Return a cleanup function. */
  setup?: (ctx: FeatureContext<C>) => void | (() => void);
}

export interface Feature<C extends object = Record<string, never>> extends FeatureDefinition<C> {
  readonly kind: 'feature';
  /** Binds config overrides to this feature: `skybox.use({ preset: 'studio' })`. */
  use(config?: Partial<C>): FeatureInstance<C>;
}

export interface FeatureInstance<C extends object = Record<string, never>> {
  readonly kind: 'feature-instance';
  feature: Feature<C>;
  config?: Partial<C>;
}

export type FeatureInput = Feature<any> | FeatureInstance<any>;

export const defineFeature = <C extends object = Record<string, never>>(definition: FeatureDefinition<C>): Feature<C> => {
  const feature: Feature<C> = {
    ...definition,
    kind: 'feature',
    use: (config) => ({ kind: 'feature-instance', feature, config }),
  };
  return feature;
};

export const toInstance = (input: FeatureInput): FeatureInstance<any> =>
  input.kind === 'feature-instance' ? input : input.use();

export interface ResolveConfigOptions<C extends object> {
  feature: FeatureDefinition<C>;
  /** From `feature.use(config)`. */
  props?: Partial<C>;
  /** From the data adapter / `featureConfig` prop. */
  adapter?: Partial<C>;
  /** Root `extensions` of the loaded glTF. */
  gltfExtensions?: Record<string, unknown>;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Precedence: props > adapter > glTF extension > defaults. Shallow merge, then validated. */
export const resolveFeatureConfig = <C extends object>({ feature, props, adapter, gltfExtensions }: ResolveConfigOptions<C>): C => {
  const fromGltf = feature.gltf ? gltfExtensions?.[feature.gltf.extension] : undefined;
  const merged = {
    ...feature.defaults,
    ...(isRecord(fromGltf) ? fromGltf : {}),
    ...adapter,
    ...props,
  };
  return feature.config ? feature.config.parse(merged) : (merged as C);
};
