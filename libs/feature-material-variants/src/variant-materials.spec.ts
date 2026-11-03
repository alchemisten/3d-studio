import { Group, Mesh, MeshStandardMaterial } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it, vi } from 'vitest';
import { bindVariantMaterials } from './variant-materials';

const fixture = () => {
  const extension = 'KHR_materials_variants';
  const scene = new Group();
  const original = new MeshStandardMaterial();
  const mesh = new Mesh(undefined, original);
  mesh.userData.gltfExtensions = { [extension]: { mappings: [{ material: 0, variants: [0] }] } };
  scene.add(mesh);
  const source = new MeshStandardMaterial();
  const getDependency = vi.fn(async () => source);
  const parser = {
    json: { extensions: { [extension]: { variants: [{ name: 'Red' }, { name: 'Blue' }] } } },
    getDependency,
    assignFinalMaterial: vi.fn(),
  };
  const changed = vi.fn();
  const binding = bindVariantMaterials({ scene, parser } as unknown as GLTF, changed);
  return { binding, mesh, original, source, getDependency, changed };
};

describe('variant material bindings', () => {
  it('restores the original for an unmapped variant', async () => {
    const { binding, mesh, original, source } = fixture();
    await binding.apply('Red');
    expect(mesh.material).not.toBe(original);
    expect(mesh.material).not.toBe(source);
    await binding.apply('Blue');
    expect(mesh.material).toBe(original);
  });

  it.each(['swap', 'dispose'])('ignores a late load after %s', async action => {
    const { binding, mesh, original, source, getDependency, changed } = fixture();
    let resolve!: (material: MeshStandardMaterial) => void;
    getDependency.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const pending = binding.apply('Red');
    if (action === 'swap') await binding.apply('Blue');
    else binding.dispose();
    resolve(source);
    await pending;
    expect(mesh.material).toBe(original);
    expect(changed).toHaveBeenCalledTimes(1);
  });
});
