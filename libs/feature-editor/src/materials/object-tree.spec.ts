import { describe, expect, it } from 'vitest';
import { Group, Mesh, Object3D, PerspectiveCamera } from 'three';
import {
  assignMaterial,
  assignMaterials,
  deriveObjectTree,
  effectiveMaterial,
  expandableKeys,
  filterTree,
  materialStates,
  meshKeyChains,
  type ObjectTreeNode,
  pathKey,
  pathToNode,
  toggleKey,
  treeKeyIntent,
  usedMaterials,
  visibleRows,
} from './object-tree';

const named = <T extends Object3D>(object: T, name: string, ...children: Object3D[]): T => {
  object.name = name;
  children.forEach((child) => object.add(child));
  return object;
};

const scene = () => {
  const door = named(new Mesh(), 'Door');
  const handle = named(new Mesh(), 'Handle');
  const frame = named(new Mesh(), 'Frame');
  const root = named(
    new Group(),
    'Scene',
    named(new Group(), 'Cabinet', door, handle, named(new Group(), 'Empty')),
    frame,
    named(new PerspectiveCamera(), 'Camera'),
  );
  return { root, door, handle, frame };
};

const keys = (node: ObjectTreeNode): unknown => [node.key, ...node.children.map(keys)];

describe('deriveObjectTree', () => {
  it('keeps meshes and the groups leading to one, keyed by their index path', () => {
    const tree = deriveObjectTree(scene().root);
    expect(keys(tree as ObjectTreeNode)).toEqual(['root', ['0', ['0/0'], ['0/1']], ['1']]);
    expect(tree?.children[0]).toMatchObject({ name: 'Cabinet', kind: 'group' });
    expect(tree?.children[0].children[0]).toMatchObject({ name: 'Door', kind: 'part' });
  });

  it('is undefined for a scene without meshes', () => {
    expect(deriveObjectTree(named(new Group(), 'Scene', new Group()))).toBeUndefined();
  });

  it('uses the host key and falls back to the path', () => {
    const { root } = scene();
    const tree = deriveObjectTree<Object3D>(root, (object) => (object.name === 'Door' ? 'part:door' : undefined));
    expect(keys(tree as ObjectTreeNode)).toEqual(['root', ['0', ['part:door'], ['0/1']], ['1']]);
    expect(pathKey([])).toBe('root');
  });

  it('merges siblings that share a key into one node', () => {
    const { root } = scene();
    const tree = deriveObjectTree<Object3D>(root, (object) =>
      object.name === 'Door' || object.name === 'Handle' ? 'colour:red' : undefined,
    );
    expect(tree?.children[0].children.map((node) => node.key)).toEqual(['colour:red']);
  });
});

describe('inheritance', () => {
  it('lets a mesh wear its own material, else the nearest assigned ancestor', () => {
    const { root, door, handle, frame } = scene();
    const chains = meshKeyChains<Object3D>(root);
    expect(chains.get(door)).toEqual(['root', '0', '0/0']);
    const assignments = { root: 'steel', '0': 'oak', '0/1': 'brass' };
    expect(effectiveMaterial(chains.get(door) ?? [], assignments)).toBe('oak');
    expect(effectiveMaterial(chains.get(handle) ?? [], assignments)).toBe('brass');
    expect(effectiveMaterial(chains.get(frame) ?? [], assignments)).toBe('steel');
    expect(effectiveMaterial(chains.get(frame) ?? [], {})).toBeUndefined();
  });

  it('reports own, inherited and mixed materials per node', () => {
    const tree = deriveObjectTree(scene().root) as ObjectTreeNode;
    const states = materialStates(tree, { '0': 'oak', '0/1': 'brass' });
    expect(states.get('root')).toEqual({ mixed: true });
    expect(states.get('0')).toEqual({ own: 'oak', mixed: true });
    expect(states.get('0/0')).toEqual({ inherited: 'oak', mixed: false });
    expect(states.get('0/1')).toEqual({ own: 'brass', mixed: false });
    expect(states.get('1')).toEqual({ mixed: false });
    expect(materialStates(tree, { root: 'steel' }).get('root')).toEqual({ own: 'steel', mixed: false });
  });

  it('assigns and clears without mutating the stored assignments', () => {
    const stored = { door: 'oak' };
    expect(assignMaterial(stored, 'frame', 'steel')).toEqual({ door: 'oak', frame: 'steel' });
    expect(assignMaterial(stored, 'door', undefined)).toEqual({});
    expect(stored).toEqual({ door: 'oak' });
  });
});

describe('rows and keyboard', () => {
  const tree = deriveObjectTree(scene().root) as ObjectTreeNode;
  const none: ReadonlySet<string> = new Set();

  it('lists the root and the children of expanded nodes with their position', () => {
    expect(expandableKeys(tree)).toEqual(['root', '0']);
    expect(visibleRows(tree, none).map((row) => [row.node.key, row.level, row.posInSet, row.setSize])).toEqual([
      ['root', 1, 1, 1],
      ['0', 2, 1, 2],
      ['0/0', 3, 1, 2],
      ['0/1', 3, 2, 2],
      ['1', 2, 2, 2],
    ]);
    const collapsed = visibleRows(tree, new Set(['0']));
    expect(collapsed.map((row) => row.node.key)).toEqual(['root', '0', '1']);
    expect(collapsed[1].expanded).toBe(false);
    expect(collapsed[2].expanded).toBeUndefined();
  });

  it('finds the path to a node', () => {
    expect(pathToNode(tree, '0/1').map((node) => node.key)).toEqual(['root', '0', '0/1']);
    expect(pathToNode(tree, 'missing')).toEqual([]);
  });

  it('follows the tree pattern for arrow, home, end and enter keys', () => {
    const rows = visibleRows(tree, new Set(['0']));
    expect(treeKeyIntent(rows, 'root', 'ArrowDown')).toEqual({ type: 'focus', key: '0' });
    expect(treeKeyIntent(rows, undefined, 'ArrowDown')).toEqual({ type: 'focus', key: 'root' });
    expect(treeKeyIntent(rows, 'root', 'ArrowUp')).toBeUndefined();
    expect(treeKeyIntent(rows, '0', 'End')).toEqual({ type: 'focus', key: '1' });
    expect(treeKeyIntent(rows, '1', 'Home')).toEqual({ type: 'focus', key: 'root' });
    expect(treeKeyIntent(rows, '0', 'ArrowRight')).toEqual({ type: 'toggle', key: '0', expanded: true });
    expect(treeKeyIntent(rows, 'root', 'ArrowRight')).toEqual({ type: 'focus', key: '0' });
    expect(treeKeyIntent(rows, 'root', 'ArrowLeft')).toEqual({ type: 'toggle', key: 'root', expanded: false });
    expect(treeKeyIntent(rows, '1', 'ArrowLeft')).toEqual({ type: 'focus', key: 'root' });
    expect(treeKeyIntent(rows, '1', 'ArrowRight')).toBeUndefined();
    expect(treeKeyIntent(rows, '1', 'Enter')).toEqual({ type: 'select', key: '1' });
    expect(treeKeyIntent(rows, '1', 'a')).toBeUndefined();
  });
});

describe('filter, selection and usage', () => {
  const tree = deriveObjectTree(scene().root) as ObjectTreeNode;

  it('reduces the tree to matching nodes and the groups leading to them', () => {
    const filtered = filterTree(tree, (node) => node.name.startsWith('Hand'));
    expect(keys(filtered as ObjectTreeNode)).toEqual(['root', ['0', ['0/1']]]);
    expect(filterTree(tree, (node) => node.name === 'Cabinet')?.children[0].children).toHaveLength(2);
    expect(filterTree(tree, () => false)).toBeUndefined();
  });

  it('toggles keys in a selection', () => {
    expect(toggleKey(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleKey(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('assigns one material to several nodes and clears them again', () => {
    const assigned = assignMaterials({ x: 'oak' }, ['a', 'b'], 'steel');
    expect(assigned).toEqual({ x: 'oak', a: 'steel', b: 'steel' });
    expect(assignMaterials(assigned, ['a', 'x'], undefined)).toEqual({ b: 'steel' });
  });

  it('lists the materials in use with the parts wearing them, most used first', () => {
    const chains = meshKeyChains<Object3D>(scene().root);
    expect(usedMaterials(chains.values(), { '0': 'oak', '1': 'steel' })).toEqual([
      { id: 'oak', keys: ['0/0', '0/1'] },
      { id: 'steel', keys: ['1'] },
    ]);
    expect(usedMaterials(chains.values(), {})).toEqual([]);
  });
});
