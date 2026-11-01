import { useEffect, useMemo } from 'react';
import { useOverlay, useSlotContext, type SlotFill, type SlotFillInput } from '@schablone/3d-studio-ui';
import { useViewer, useViewerState } from '../store';
import { resolveFeatureConfig, toInstance, type FeatureContext, type FeatureInput } from './feature';

export interface ResolvedFeature {
  id: string;
  instance: ReturnType<typeof toInstance>;
  context: FeatureContext<any>;
}

/**
 * Resolves the config of every feature once the model is loaded and wires
 * their slots and `setup` hooks. Must run in the DOM tree (outside `<Canvas>`).
 */
export const useFeatures = (inputs: FeatureInput[] | undefined, featureConfig: Record<string, unknown> | undefined): ResolvedFeature[] => {
  const viewer = useViewer();
  const overlay = useOverlay();
  const { store: slotStore } = useSlotContext();
  const gltf = useViewerState((s) => s.gltf);
  const extensions = (gltf?.parser?.json as { extensions?: Record<string, unknown> } | undefined)?.extensions;

  const resolved = useMemo<ResolvedFeature[]>(() => {
    if (!gltf) {
      return [];
    }
    return (inputs ?? []).map((input) => {
      const instance = toInstance(input);
      const { feature } = instance;
      const config = resolveFeatureConfig({
        feature,
        props: instance.config,
        adapter: featureConfig?.[feature.id] as object | undefined,
        gltfExtensions: extensions,
      });
      return { id: feature.id, instance, context: { config, viewer, overlay } };
    });
  }, [gltf, inputs, featureConfig, extensions, viewer, overlay]);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    for (const { id, instance, context } of resolved) {
      const { feature } = instance;
      const slots = typeof feature.slots === 'function' ? feature.slots(context) : feature.slots;
      Object.entries(slots ?? {}).forEach(([name, input]) => {
        const normalized = normalize(input as SlotFillInput);
        cleanups.push(slotStore.add(name, { id: `feature:${id}`, ...normalized } as SlotFill));
      });
      const cleanup = feature.setup?.(context);
      if (cleanup) {
        cleanups.push(cleanup);
      }
    }
    return () => cleanups.forEach((fn) => fn());
  }, [resolved, slotStore]);

  return resolved;
};

const normalize = (input: SlotFillInput) =>
  typeof input === 'object' && input !== null && 'content' in input && !('$$typeof' in input)
    ? { mode: input.mode ?? 'append', order: input.order ?? 0, content: input.content }
    : { mode: 'append' as const, order: 0, content: input };
