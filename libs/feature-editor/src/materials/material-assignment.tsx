import { useEffect, useMemo, useRef } from 'react';
import { Layers } from 'lucide-react';
import { useThree } from '@react-three/fiber';
import type { Object3D } from 'three';
import { defineFeature, useFeature, useModelPick, useViewer, useViewerState } from '@schablone/3d-studio-core';
import { useCameraBridge } from '../camera-bridge';
import { PartOutline } from '../part-outline';
import { editorTabSlots } from '../shell/editor-tab';
import { useHelperColor } from '../use-helper-color';
import { raycastModel } from '../viewport';
import {
  type MaterialAssignmentConfig,
  materialAssignmentConfig,
  materialAssignmentStateOf,
  MATERIALS_TAB_ID,
  patchMaterialAssignmentState,
} from './material-assignment-state';
import { MaterialBrowser } from './material-browser';
import { meshKeyChains } from './object-tree';
import { PartsView } from './parts-view';
import { useAssignedMaterials } from './use-assigned-materials';
import { useMaterialAssignment } from './use-material-assignment';

const keyOfObject = (chains: ReadonlyMap<Object3D, string[]>, object: Object3D | undefined): string | undefined => {
  for (let node: Object3D | null | undefined = object; node; node = node.parent) {
    const key = chains.get(node)?.at(-1);
    if (key !== undefined) return key;
  }
  return undefined;
};

/** The canvas side of the material tab: selecting parts by click, hovering, and their outlines. */
const MaterialAssignmentScene = () => {
  const { config } = useFeature<MaterialAssignmentConfig>();
  const viewer = useViewer();
  const assignment = useMaterialAssignment(config);
  const gltf = useViewerState((state) => state.gltf);
  const dropKey = useViewerState((state) => materialAssignmentStateOf(state).dropKey);
  const canvas = useThree((state) => state.gl.domElement);
  const get = useThree((state) => state.get);
  const { active, parts, selectedKeys, hoverKey } = assignment;
  const outlineColor = useHelperColor(config.selectionColor);
  const model = gltf?.scene;
  const chains = useMemo(
    () => (model ? meshKeyChains<Object3D>(model, config.partKeyOf) : new Map<Object3D, string[]>()),
    [model, config.partKeyOf],
  );
  useCameraBridge();

  useModelPick(
    active
      ? ({ object, additive }) => {
          const key = keyOfObject(chains, object);
          if (key !== undefined) assignment.select(key, additive);
        }
      : undefined,
  );

  useEffect(() => {
    if (!active || !model) return undefined;
    const onMove = (event: PointerEvent) => {
      if (event.buttons !== 0) return;
      const hit = raycastModel(get(), model, event.clientX, event.clientY);
      patchMaterialAssignmentState(viewer, { hoverKey: keyOfObject(chains, hit?.object) });
    };
    const onLeave = () => patchMaterialAssignmentState(viewer, { hoverKey: undefined });
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      onLeave();
    };
  }, [active, model, chains, canvas, get, viewer]);

  const selection = selectedKeys.join('\n');
  const outlined = useMemo(() => {
    const keys = [...new Set([...selection.split('\n'), hoverKey, dropKey])];
    return keys.flatMap((key) => (key ? (parts.get(key)?.meshes ?? []) : []));
  }, [selection, hoverKey, dropKey, parts]);

  return active && outlined.length > 0 ? <PartOutline objects={outlined} color={outlineColor} /> : null;
};

/** The DOM side over the viewport: applies the materials and clears the selection on Escape. */
const MaterialOverlay = ({ config }: { config: MaterialAssignmentConfig }) => {
  const assignment = useMaterialAssignment(config);
  const latest = useRef(assignment);
  latest.current = assignment;
  useAssignedMaterials(config);

  const { active } = assignment;
  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as Element | null;
      const inEditor = target === document.body || Boolean(target?.closest?.('.ds-editor'));
      if (event.key !== 'Escape' || !inEditor || latest.current.selectedKeys.length === 0) return;
      event.preventDefault();
      latest.current.back();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active]);

  return null;
};

/** The material tab: the parts of the model, or the material browser for the selected ones in its place. */
export const MaterialPanel = ({ config }: { config: MaterialAssignmentConfig }) => {
  const assignment = useMaterialAssignment(config);
  return assignment.view === 'material' ? (
    <MaterialBrowser assignment={assignment} emptyAction={config.emptyAction} />
  ) : (
    <PartsView assignment={assignment} />
  );
};

/**
 * Editor tab that assigns materials of a host-supplied library to the parts of the model: select parts in
 * the tree or in 3D, browse the library with a live preview, apply by click or by dragging a swatch onto a
 * part. Everything beneath a part inherits its material. Reports `{ type: 'materials' }` with the material
 * id per part key. Usage: `materialAssignment.use({ library, partKeyOf })`.
 */
export const materialAssignment = defineFeature<MaterialAssignmentConfig>({
  id: 'material-assignment',
  config: materialAssignmentConfig,
  scene: MaterialAssignmentScene,
  slots: ({ config }) => ({
    'viewer.layer': { mode: 'append', order: 0, content: <MaterialOverlay config={config} /> },
    ...editorTabSlots({
      id: MATERIALS_TAB_ID,
      label: 'materials.tool',
      icon: <Layers size={18} aria-hidden="true" />,
      order: 10,
      panel: <MaterialPanel config={config} />,
    }),
  }),
});
