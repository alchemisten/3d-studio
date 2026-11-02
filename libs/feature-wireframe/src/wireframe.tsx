import { useEffect } from 'react';
import type { Material } from 'three';
import { defineFeature, useFeature, useFeatureEnabled, useViewerState } from '@schablone/3d-studio-core';

export interface WireframeConfig {
  /** Initial state of the toggle. */
  enabled: boolean;
}

type WireframeMaterial = Material & { wireframe?: boolean };

const WireframeScene = () => {
  const { viewer } = useFeature<WireframeConfig>();
  const enabled = useFeatureEnabled();
  const gltf = useViewerState((s) => s.gltf);

  useEffect(() => {
    const touched = new Map<WireframeMaterial, boolean>();
    const restore = () => {
      touched.forEach((original, material) => {
        material.wireframe = original;
        material.needsUpdate = true;
      });
      touched.clear();
    };
    const apply = () => {
      restore();
      if (!enabled) return;
      gltf?.scene.traverse((object) => {
        const materials = (object as { material?: WireframeMaterial | WireframeMaterial[] }).material;
        for (const material of Array.isArray(materials) ? materials : [materials]) {
          if (typeof material?.wireframe !== 'boolean' || touched.has(material)) continue;
          touched.set(material, material.wireframe);
          material.wireframe = true;
          material.needsUpdate = true;
        }
      });
    };
    apply();
    const sub = viewer.on$('model:materials-changed').subscribe(apply);
    return () => {
      sub.unsubscribe();
      restore();
    };
  }, [gltf, enabled, viewer]);

  return null;
};

/** Toggle in the 'View options' menu. Usage: `wireframe.use({ enabled: false })` */
export const wireframe = defineFeature<WireframeConfig>({
  id: 'wireframe',
  defaults: { enabled: false },
  gltf: { extension: 'ALCM_wireframe' },
  toggle: { label: 'Wireframe' },
  scene: WireframeScene,
});
