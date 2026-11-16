import type { MaterialAssignments } from '../editor-value';
import { omitKey } from '../record';

/** The part of a scene graph node the tree is derived from; three.js `Object3D` satisfies it. */
export interface TreeSource {
  name: string;
  children: readonly TreeSource[];
  isMesh?: boolean;
}

/**
 * Identity of a scene node in the tree and in the stored assignments. `path` holds the child indices from
 * the root. Return `undefined` to fall back to the path; nodes that share a key become one entry.
 */
export type PartKeyOf<T extends TreeSource = TreeSource> = (object: T, path: readonly number[]) => string | undefined;

export interface ObjectTreeNode {
  key: string;
  name: string;
  /** `part` for meshes, `group` for everything that only holds other nodes. */
  kind: 'group' | 'part';
  children: ObjectTreeNode[];
}

export interface MaterialState {
  /** Assigned to the node itself. */
  own?: string;
  /** Inherited from the nearest ancestor with an assignment. */
  inherited?: string;
  /** The parts beneath the node do not all wear the same material. */
  mixed: boolean;
}

const ROOT_KEY = 'root';

/** The default identity: the child indices from the root, e.g. `0/2/1`. */
export const pathKey = (path: readonly number[]): string => (path.length ? path.join('/') : ROOT_KEY);

const keyOf = <T extends TreeSource>(object: T, path: readonly number[], partKeyOf?: PartKeyOf<T>): string =>
  partKeyOf?.(object, path) ?? pathKey(path);

const merged = (nodes: readonly ObjectTreeNode[]): ObjectTreeNode[] =>
  nodes.reduce<ObjectTreeNode[]>((result, node) => {
    const twin = result.find((entry) => entry.key === node.key);
    return twin
      ? result.map((entry) =>
          entry === twin ? { ...twin, children: merged([...twin.children, ...node.children]) } : entry,
        )
      : [...result, node];
  }, []);

const nodeOf = <T extends TreeSource>(
  object: T,
  path: readonly number[],
  partKeyOf: PartKeyOf<T> | undefined,
): ObjectTreeNode | undefined => {
  const children = merged(
    object.children.flatMap((child, index) => nodeOf(child as T, [...path, index], partKeyOf) ?? []),
  );
  if (!object.isMesh && children.length === 0) return undefined;
  return { key: keyOf(object, path, partKeyOf), name: object.name, kind: object.isMesh ? 'part' : 'group', children };
};

/** The object tree of a scene graph: every mesh and the groups leading to one; `undefined` without meshes. */
export const deriveObjectTree = <T extends TreeSource>(root: T, partKeyOf?: PartKeyOf<T>): ObjectTreeNode | undefined =>
  nodeOf(root, [], partKeyOf);

/** The keys from the root down to each mesh, for looking up what a mesh inherits. */
export const meshKeyChains = <T extends TreeSource>(root: T, partKeyOf?: PartKeyOf<T>): Map<T, string[]> => {
  const chains = new Map<T, string[]>();
  const visit = (object: T, path: readonly number[], ancestors: readonly string[]) => {
    const chain = [...ancestors, keyOf(object, path, partKeyOf)];
    if (object.isMesh) chains.set(object, chain);
    object.children.forEach((child, index) => visit(child as T, [...path, index], chain));
  };
  visit(root, [], []);
  return chains;
};

/** The material a node wears: its own, else the one of its nearest assigned ancestor. */
export const effectiveMaterial = (chain: readonly string[], assignments: MaterialAssignments): string | undefined =>
  [...chain].reverse().flatMap((key) => assignments[key] ?? [])[0];

/** The nodes from the root down to `key`; empty when the tree has no such node. */
export const pathToNode = (tree: ObjectTreeNode, key: string): ObjectTreeNode[] => {
  if (tree.key === key) return [tree];
  for (const child of tree.children) {
    const path = pathToNode(child, key);
    if (path.length) return [tree, ...path];
  }
  return [];
};

/** Own, inherited and mixed material of every node. */
export const materialStates = (tree: ObjectTreeNode, assignments: MaterialAssignments): Map<string, MaterialState> => {
  const states = new Map<string, MaterialState>();
  const visit = (node: ObjectTreeNode, inherited: string | undefined): Set<string | undefined> => {
    const own = assignments[node.key];
    const effective = own ?? inherited;
    const worn = new Set<string | undefined>(node.kind === 'part' || node.children.length === 0 ? [effective] : []);
    node.children.forEach((child) => visit(child, effective).forEach((material) => worn.add(material)));
    states.set(node.key, {
      ...(own === undefined ? {} : { own }),
      ...(own !== undefined || inherited === undefined ? {} : { inherited }),
      mixed: worn.size > 1,
    });
    return worn;
  };
  visit(tree, undefined);
  return states;
};

/** Assigns a material to a node, or clears its own assignment with `undefined`. */
export const assignMaterial = (
  assignments: MaterialAssignments,
  key: string,
  materialId: string | undefined,
): MaterialAssignments =>
  materialId === undefined ? omitKey(assignments, key) : { ...assignments, [key]: materialId };

/** Every node that has children, i.e. can be expanded. */
export const expandableKeys = (tree: ObjectTreeNode): string[] =>
  tree.children.length ? [tree.key, ...tree.children.flatMap(expandableKeys)] : [];

export interface TreeRow {
  node: ObjectTreeNode;
  level: number;
  parentKey?: string;
  setSize: number;
  posInSet: number;
  /** `undefined` for nodes without children. */
  expanded?: boolean;
}

/** The visible rows of the tree: the root and every child of an expanded node, depth first. */
export const visibleRows = (tree: ObjectTreeNode, collapsed: ReadonlySet<string>): TreeRow[] => {
  const rowsOf = (
    node: ObjectTreeNode,
    level: number,
    setSize: number,
    posInSet: number,
    parentKey?: string,
  ): TreeRow[] => {
    const expanded = node.children.length ? !collapsed.has(node.key) : undefined;
    return [
      { node, level, parentKey, setSize, posInSet, expanded },
      ...(expanded
        ? node.children.flatMap((child, index) => rowsOf(child, level + 1, node.children.length, index + 1, node.key))
        : []),
    ];
  };
  return rowsOf(tree, 1, 1, 1);
};

export type TreeIntent =
  { type: 'focus'; key: string } | { type: 'select'; key: string } | { type: 'toggle'; key: string; expanded: boolean };

/** What a key press on the focused row does, following the WAI-ARIA tree pattern. */
export const treeKeyIntent = (
  rows: readonly TreeRow[],
  focusedKey: string | undefined,
  key: string,
): TreeIntent | undefined => {
  const index = rows.findIndex((row) => row.node.key === focusedKey);
  const row = rows[index];
  const focus = (target: TreeRow | undefined): TreeIntent | undefined =>
    target && { type: 'focus', key: target.node.key };
  switch (key) {
    case 'ArrowDown':
      return focus(rows[index + 1] ?? (index < 0 ? rows[0] : undefined));
    case 'ArrowUp':
      return focus(rows[index - 1]);
    case 'Home':
      return focus(rows[0]);
    case 'End':
      return focus(rows.at(-1));
    case 'ArrowRight':
      if (!row || row.expanded === undefined) return undefined;
      return row.expanded ? focus(rows[index + 1]) : { type: 'toggle', key: row.node.key, expanded: true };
    case 'ArrowLeft':
      if (!row) return undefined;
      return row.expanded
        ? { type: 'toggle', key: row.node.key, expanded: false }
        : focus(rows.find((candidate) => candidate.node.key === row.parentKey));
    case 'Enter':
    case ' ':
      return row && { type: 'select', key: row.node.key };
    default:
      return undefined;
  }
};

/** The tree reduced to the nodes that match and the groups leading to them; `undefined` without a match. */
export const filterTree = (
  tree: ObjectTreeNode,
  matches: (node: ObjectTreeNode) => boolean,
): ObjectTreeNode | undefined => {
  if (matches(tree)) return tree;
  const children = tree.children.flatMap((child) => filterTree(child, matches) ?? []);
  return children.length ? { ...tree, children } : undefined;
};

/** Adds a key to a selection or removes it when it is already part of it. */
export const toggleKey = (keys: readonly string[], key: string): string[] =>
  keys.includes(key) ? keys.filter((entry) => entry !== key) : [...keys, key];

export interface UsedMaterial {
  /** Library material id. */
  id: string;
  /** Keys of the parts that wear it, their own or inherited. */
  keys: string[];
}

/** The library materials in use with the parts wearing them, most used first. */
export const usedMaterials = (
  chains: Iterable<readonly string[]>,
  assignments: MaterialAssignments,
): UsedMaterial[] => {
  const used = new Map<string, string[]>();
  for (const chain of chains) {
    const id = effectiveMaterial(chain, assignments);
    const key = chain.at(-1);
    if (id !== undefined && key !== undefined) used.set(id, [...new Set([...(used.get(id) ?? []), key])]);
  }
  return [...used].map(([id, keys]) => ({ id, keys })).sort((a, b) => b.keys.length - a.keys.length);
};

/** Assigns a material to several nodes at once, or clears their own assignments with `undefined`. */
export const assignMaterials = (
  assignments: MaterialAssignments,
  keys: readonly string[],
  materialId: string | undefined,
): MaterialAssignments => keys.reduce((result, key) => assignMaterial(result, key, materialId), assignments);
