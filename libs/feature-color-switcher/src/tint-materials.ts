import type { Mesh, MeshStandardMaterial, Object3D } from 'three';

export const tintMaterials = (model: Object3D, names: readonly string[]) => {
  const materials = new Set<MeshStandardMaterial>();
  model.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const paint = material as MeshStandardMaterial;
      if (paint.color?.isColor && names.includes(paint.name)) materials.add(paint);
    }
  });
  return [...materials];
};
