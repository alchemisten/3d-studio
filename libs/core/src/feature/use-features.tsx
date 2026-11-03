import { useEffect, useMemo, type ReactNode } from 'react';
import { bindViewerQuery, choiceSetting, type QuerySetting, type ViewerQuery, useViewer as useViewerStore } from '../store';
import { MenuCheckboxItem, useOverlay, useSlotContext, type SlotFill, type SlotFillInput } from '@schablone/3d-studio-ui';
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
export const useFeatures = (inputs: FeatureInput[] | undefined, featureConfig: Record<string, unknown> | undefined, query?: ViewerQuery): ResolvedFeature[] => {
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
      return { id: feature.id, instance, context: { id: feature.id, config, viewer, overlay } };
    });
  }, [gltf, inputs, featureConfig, extensions, viewer, overlay]);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    const settings: { featureId: string; setting: QuerySetting }[] = [];
    for (const { id, instance, context } of resolved) {
      const { feature } = instance;
      const slots = typeof feature.slots === 'function' ? feature.slots(context) : feature.slots;
      Object.entries(slots ?? {}).forEach(([name, input]) => {
        const normalized = normalize(input as SlotFillInput);
        cleanups.push(slotStore.add(name, { id: `feature:${id}`, ...normalized } as SlotFill));
      });
      if (feature.toggle) {
        const { label, icon, order } = feature.toggle;
        if (query) settings.push({ featureId: id, setting: choiceSetting(id, ['0', '1'], context.config.enabled ? '1' : '0',
          () => viewer.getState().featureEnabled[id] ? '1' : '0',
          value => viewer.setFeatureEnabled(id, value === '1')) });
        if (!(id in viewer.getState().featureEnabled)) {
          viewer.setFeatureEnabled(id, Boolean((context.config as { enabled?: boolean }).enabled));
        }
        cleanups.push(
          slotStore.add('viewer.options', {
            id: `toggle:${id}`,
            mode: 'append',
            order: order ?? 0,
            content: <ToggleItem featureId={id} label={label} icon={icon} />,
          }),
        );
      }
      const cleanup = feature.setup?.(context);
      if (query) for (const setting of feature.querySettings?.(context) ?? []) settings.push({ featureId: id, setting });
      if (cleanup) {
        cleanups.push(cleanup);
      }
    }
    const unbind = query && bindViewerQuery(viewer, settings, query);
    return () => { unbind?.(); cleanups.forEach((fn) => fn()); };
  }, [resolved, slotStore, viewer, query]);

  return resolved;
};

const normalize = (input: SlotFillInput) =>
  typeof input === 'object' && input !== null && 'content' in input && !('$$typeof' in input)
    ? { mode: input.mode ?? 'append', order: input.order ?? 0, content: input.content }
    : { mode: 'append' as const, order: 0, content: input };

const ToggleItem = ({ featureId, label, icon }: { featureId: string; label: string; icon?: ReactNode }) => {
  const viewer = useViewerStore();
  const checked = useViewerState((s) => s.featureEnabled[featureId] ?? false);
  return (
    <MenuCheckboxItem
      label={label}
      icon={icon}
      className={`ds-view-option ds-view-option--${featureId}`}
      testId={`ds-view-option-${featureId}`}
      checked={checked} onChange={(v) => viewer.setFeatureEnabled(featureId, v)} />
  );
};
