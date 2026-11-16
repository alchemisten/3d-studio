import { useMemo, useState } from 'react';
import type { Material, Mesh, Object3D } from 'three';
import { useViewer, useViewerState } from '@schablone/3d-studio-core';
import { editorCameraOf } from '../camera-bridge';
import { useEditor } from '../editor-context';
import { encodePartKeys, partKeysOf } from '../editor-nav';
import { useEditorNav } from '../shell/shell-context';
import { raycastModel } from '../viewport';
import {
  type MaterialAssignmentConfig,
  materialAssignmentStateOf,
  MATERIALS_TAB_ID,
  originalMaterialOf,
  patchMaterialAssignmentState,
  resolveLibrary,
} from './material-assignment-state';
import type { LibraryMaterial } from './material-library';
import {
  assignMaterials,
  deriveObjectTree,
  filterTree,
  type MaterialState,
  materialStates,
  meshKeyChains,
  type ObjectTreeNode,
  pathToNode,
  toggleKey,
  type TreeRow,
  type UsedMaterial,
  usedMaterials,
  visibleRows,
} from './object-tree';

/** What the tree and the browser show for one node. */
export interface PartInfo {
  /** The node's name, else the name of its source material. */
  name: string;
  /** The colour the part came with, when all its meshes share one. */
  sourceColor?: string;
  /** The meshes of the node and everything beneath it. */
  meshes: Object3D[];
}

export interface MaterialAssignmentApi {
  /** Whether the material tab is the open one. */
  active: boolean;
  /** `parts` shows the tree, `material` the browser for the selected parts. */
  view: 'parts' | 'material';
  /** `undefined` while the model is loading or has no meshes. */
  tree: ObjectTreeNode | undefined;
  /** The visible rows, reduced by the filter. */
  rows: TreeRow[];
  states: ReadonlyMap<string, MaterialState>;
  parts: ReadonlyMap<string, PartInfo>;
  library: LibraryMaterial[];
  libraryById: ReadonlyMap<string, LibraryMaterial>;
  used: UsedMaterial[];
  selectedKeys: string[];
  hoverKey: string | undefined;
  filter: string;
  setFilter: (filter: string) => void;
  /** The material every selected node wears itself; `undefined` when they differ or wear none. */
  currentId: string | undefined;
  /** Selects a part. `additive` toggles it in the selection and keeps the tree open. */
  select: (key: string, additive?: boolean) => void;
  /** Selects several parts at once and keeps the tree open. */
  selectMany: (keys: readonly string[]) => void;
  /** Selects every part that came with the same colour as the given one. */
  selectSameColor: (key: string) => void;
  /** Opens the material browser for the selection. */
  openBrowser: () => void;
  /** Clears the selection and returns to the tree. */
  back: () => void;
  setExpanded: (key: string, expanded: boolean) => void;
  hover: (key: string | undefined) => void;
  /** Shows a material on the selection without assigning it; `null` shows the original, `undefined` ends it. */
  preview: (materialId: string | null | undefined) => void;
  /** The key of the part under a pointer in the 3D view; `undefined` outside the model. */
  partAt: (clientX: number, clientY: number) => string | undefined;
  /** Marks the part a dragged material would land on. */
  dropOn: (key: string | undefined) => void;
  /** Assigns a material to every selected part; `undefined` clears their own assignments. */
  apply: (materialId: string | undefined, keys?: readonly string[]) => void;
}

const NO_STATES: ReadonlyMap<string, MaterialState> = new Map();

const colorOf = (mesh: Mesh): string | undefined => {
  const material = originalMaterialOf(mesh);
  const first = (Array.isArray(material) ? material[0] : material) as
    (Material & { color?: { getHexString(): string } }) | undefined;
  return first?.color ? `#${first.color.getHexString()}` : undefined;
};

const materialNameOf = (mesh: Mesh): string => {
  const material = originalMaterialOf(mesh);
  return (Array.isArray(material) ? material[0] : material)?.name ?? '';
};

const partsOf = (chains: ReadonlyMap<Object3D, string[]>): Map<string, PartInfo> => {
  const parts = new Map<string, PartInfo & { colors: Set<string | undefined> }>();
  chains.forEach((chain, object) => {
    const mesh = object as Mesh;
    chain.forEach((key, depth) => {
      const known = parts.get(key) ?? { name: '', meshes: [], colors: new Set<string | undefined>() };
      known.meshes.push(mesh);
      known.colors.add(colorOf(mesh));
      if (depth === chain.length - 1) known.name = mesh.name || materialNameOf(mesh);
      parts.set(key, known);
    });
  });
  return new Map(
    [...parts].map(([key, { colors, ...part }]) => [
      key,
      { ...part, ...(colors.size === 1 ? { sourceColor: [...colors][0] } : {}) },
    ]),
  );
};

/** State and actions of the material tab: the object tree, the selected parts and the library. */
export const useMaterialAssignment = (config: MaterialAssignmentConfig): MaterialAssignmentApi => {
  const viewer = useViewer();
  const { value, emit, t } = useEditor();
  const { nav, navigate } = useEditorNav();
  const gltf = useViewerState((state) => state.gltf);
  const hoverKey = useViewerState((state) => materialAssignmentStateOf(state).hoverKey);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [filter, setFilter] = useState('');
  const { partKeyOf } = config;
  const signature = JSON.stringify(config.library);
  const library = useMemo(() => resolveLibrary(JSON.parse(signature)), [signature]);
  const libraryById = useMemo(() => new Map(library.map((entry) => [entry.id, entry])), [library]);

  const model = gltf?.scene;
  const tree = useMemo(() => model && deriveObjectTree<Object3D>(model, partKeyOf), [model, partKeyOf]);
  const chains = useMemo(
    () => (model ? meshKeyChains<Object3D>(model, partKeyOf) : new Map<Object3D, string[]>()),
    [model, partKeyOf],
  );
  const parts = useMemo(() => {
    const derived = partsOf(chains);
    const named = (node: ObjectTreeNode) => {
      const part = derived.get(node.key);
      if (part) derived.set(node.key, { ...part, name: node.name || part.name || t('materials.unnamed') });
      node.children.forEach(named);
    };
    if (tree) named(tree);
    return derived;
  }, [chains, tree, t]);
  const selectedKeys = useMemo(() => partKeysOf({ part: nav.part }), [nav.part]);
  const active = nav.tool === MATERIALS_TAB_ID;

  const rows = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const shown =
      tree && needle
        ? filterTree(tree, (node) => (parts.get(node.key)?.name ?? '').toLowerCase().includes(needle))
        : tree;
    const revealed = tree
      ? selectedKeys.flatMap((key) =>
          pathToNode(tree, key)
            .slice(0, -1)
            .map((node) => node.key),
        )
      : [];
    const hidden = needle ? new Set<string>() : new Set([...collapsed].filter((key) => !revealed.includes(key)));
    return shown ? visibleRows(shown, hidden) : [];
  }, [tree, filter, parts, collapsed, selectedKeys]);
  const states = useMemo(() => (tree ? materialStates(tree, value.materials) : NO_STATES), [tree, value.materials]);
  const used = useMemo(() => usedMaterials(chains.values(), value.materials), [chains, value.materials]);

  const owned = selectedKeys.map((key) => value.materials[key]);
  const selectMany = (keys: readonly string[]) =>
    navigate({ tool: MATERIALS_TAB_ID, part: encodePartKeys(keys), mode: 'pick-part' });

  return {
    active,
    view: selectedKeys.length > 0 && nav.mode !== 'pick-part' ? 'material' : 'parts',
    tree,
    rows,
    states,
    parts,
    library,
    libraryById,
    used,
    selectedKeys,
    hoverKey,
    filter,
    setFilter,
    currentId: owned.length > 0 && owned.every((id) => id === owned[0]) ? owned[0] : undefined,
    select: (key, additive = false) => {
      if (additive || nav.mode === 'pick-part') {
        selectMany(additive ? toggleKey(selectedKeys, key) : [key]);
      } else {
        navigate({ tool: MATERIALS_TAB_ID, part: encodePartKeys([key]), mode: undefined });
      }
    },
    selectMany,
    selectSameColor: (key) => {
      const color = parts.get(key)?.sourceColor;
      if (color === undefined) return;
      selectMany(
        [...chains.values()]
          .flatMap((chain) => chain.at(-1) ?? [])
          .filter((leaf) => parts.get(leaf)?.sourceColor === color),
      );
    },
    openBrowser: () => navigate({ mode: undefined }),
    back: () => {
      patchMaterialAssignmentState(viewer, { previewId: undefined });
      navigate({ part: undefined, mode: undefined });
    },
    setExpanded: (key, expanded) =>
      setCollapsed((current) =>
        expanded ? new Set([...current].filter((entry) => entry !== key)) : new Set([...current, key]),
      ),
    hover: (key) => patchMaterialAssignmentState(viewer, { hoverKey: key }),
    partAt: (clientX, clientY) => {
      const state = editorCameraOf(viewer)?.three();
      const bounds = state?.gl.domElement.getBoundingClientRect();
      const inside =
        bounds &&
        clientX >= bounds.left &&
        clientX <= bounds.right &&
        clientY >= bounds.top &&
        clientY <= bounds.bottom;
      if (!state || !model || !inside) return undefined;
      for (let node = raycastModel(state, model, clientX, clientY)?.object ?? null; node; node = node.parent) {
        const key = chains.get(node)?.at(-1);
        if (key !== undefined) return key;
      }
      return undefined;
    },
    dropOn: (key) => patchMaterialAssignmentState(viewer, { dropKey: key }),
    preview: (materialId) => patchMaterialAssignmentState(viewer, { previewId: materialId }),
    apply: (materialId, keys = selectedKeys) => {
      patchMaterialAssignmentState(viewer, { previewId: undefined });
      if (keys.length) emit({ type: 'materials', materials: assignMaterials(value.materials, keys, materialId) });
    },
  };
};
