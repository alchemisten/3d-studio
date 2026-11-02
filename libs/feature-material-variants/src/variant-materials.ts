import type { Material, Mesh } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { z } from 'zod';

const extension = 'KHR_materials_variants';
const index = z.number().int().nonnegative();
const catalog = z.object({ variants: z.array(z.object({ name: z.string().min(1) })) });
const primitive = z.object({ mappings: z.array(z.object({ material: index, variants: z.array(index) })) });

export const variantNames = (gltf: GLTF) => {
  const data = gltf.parser.json.extensions?.[extension];
  return data ? catalog.parse(data).variants.map((entry) => entry.name) : [];
};

export const bindVariantMaterials = (gltf: GLTF, changed: () => void) => {
  const names = variantNames(gltf);
  const bindings: { mesh: Mesh; original: Material | Material[]; materialByVariant: Map<number, number> }[] = [];
  gltf.scene.traverse((object) => {
    const mesh = object as Mesh;
    const data = mesh.userData.gltfExtensions?.[extension];
    if (!mesh.isMesh || !data) return;
    const materialByVariant = new Map<number, number>();
    for (const mapping of primitive.parse(data).mappings) {
      for (const variant of mapping.variants) materialByVariant.set(variant, mapping.material);
    }
    bindings.push({ mesh, original: mesh.material, materialByVariant });
  });
  const local = new Map<Material, Material>();
  let generation = 0;
  return {
    apply: async (name: string | null) => {
      const request = ++generation;
      const variant = name === null ? -1 : names.indexOf(name);
      const resolved = await Promise.all(
        bindings.map(async (binding) => {
          const materialIndex = binding.materialByVariant.get(variant);
          if (materialIndex === undefined) return undefined;
          const material: Material = await gltf.parser.getDependency('material', materialIndex);
          const probe = binding.mesh.clone(false);
          probe.material = material;
          gltf.parser.assignFinalMaterial(probe);
          return probe.material as Material;
        }),
      );
      if (request !== generation) return;
      bindings.forEach(({ mesh, original }, i) => {
        const source = resolved[i];
        if (!source) mesh.material = original;
        else {
          const material = local.get(source) ?? source.clone();
          local.set(source, material);
          mesh.material = material;
        }
      });
      changed();
    },
    dispose: () => {
      generation++;
      bindings.forEach(({ mesh, original }) => {
        mesh.material = original;
      });
      changed();
      local.forEach((material) => material.dispose());
    },
  };
};
