import { useMemo } from 'react';
import {
  type FeatureInput,
  type OpeningCamera,
  resolveFeatureConfig,
  toInstance,
  useViewer,
  useViewerState,
} from '@schablone/3d-studio-core';
import { editorCameraOf, openingCameraOf } from '../camera-bridge';
import { useEditor } from '../editor-context';
import { isRecord } from '../record';
import { diffConfig } from './config-diff';
import { tintSection } from './default-sections';
import type { SetConfig, SettingsContext, SettingsSection } from './settings-section';
import { isOverridden } from '../runtime-overrides';

export interface ResolvedSection {
  section: SettingsSection;
  context: SettingsContext;
  /** Merges a patch into the feature's config and reports the feature's overrides. */
  setConfig: SetConfig;
}

export interface SceneSettingsApi {
  /** The sections whose feature is part of the viewer and has something to configure. */
  sections: ResolvedSection[];
  openingCamera: OpeningCamera | undefined;
  /** Makes the current view the opening view. */
  captureOpeningCamera: () => void;
  resetOpeningCamera: () => void;
}

interface FeatureConfigs {
  /** The config without the edited overrides: defaults, glTF extension and `use()` props. */
  baseline: Record<string, unknown>;
  resolved: Record<string, unknown>;
}

const resolveConfigs = (
  input: FeatureInput,
  overrides: unknown,
  gltfExtensions: Record<string, unknown> | undefined,
): FeatureConfigs => {
  const { feature, config: props } = toInstance(input);
  return {
    baseline: resolveFeatureConfig({ feature, props, gltfExtensions }),
    resolved: resolveFeatureConfig({
      feature,
      props,
      adapter: isRecord(overrides) ? overrides : undefined,
      gltfExtensions,
    }),
  };
};

/** The editable settings of the viewer's features with their resolved values. */
export const useSceneSettings = (sections: readonly SettingsSection[]): SceneSettingsApi => {
  const viewer = useViewer();
  const { value, emit, features, overrides, t, locale } = useEditor();
  const gltf = useViewerState((state) => state.gltf);
  const status = useViewerState((state) => state.status);

  const resolved = useMemo(() => {
    const extensions = (gltf?.parser?.json as { extensions?: Record<string, unknown> } | undefined)?.extensions;
    const byId = new Map(features.map((input) => [toInstance(input).feature.id, input]));
    const tints = features
      .map((input) => toInstance(input).feature)
      .filter(({ id, defaults }) => {
        const shape = defaults as { materials?: unknown; colors?: unknown } | undefined;
        const isTint = Array.isArray(shape?.materials) && Array.isArray(shape?.colors);
        return isTint && !sections.some((section) => section.featureId === id);
      })
      .map(({ id }) => tintSection(id));
    return [...sections, ...tints].flatMap((section): ResolvedSection[] => {
      const input = byId.get(section.featureId);
      if (!input || status !== 'ready') return [];
      const configs = resolveConfigs(input, value.featureConfig[section.featureId], extensions);
      const context: SettingsContext = {
        config: configs.resolved,
        viewer,
        t,
        locale,
        isLive: (key) => !isOverridden(overrides, section.featureId, key),
      };
      if (section.available && !section.available(context)) return [];
      return [
        {
          section,
          context,
          setConfig: (patch, options) =>
            emit(
              {
                type: 'feature-config',
                featureId: section.featureId,
                config: diffConfig(configs.baseline, { ...configs.resolved, ...patch }),
              },
              options,
            ),
        },
      ];
    });
  }, [sections, features, overrides, value.featureConfig, gltf, status, viewer, emit, t, locale]);

  return {
    sections: resolved,
    openingCamera: value.openingCamera,
    captureOpeningCamera: () => {
      const pose = editorCameraOf(viewer)?.capture();
      if (pose) emit({ type: 'opening-camera', openingCamera: openingCameraOf(pose) });
    },
    resetOpeningCamera: () => emit({ type: 'opening-camera', openingCamera: undefined }),
  };
};
