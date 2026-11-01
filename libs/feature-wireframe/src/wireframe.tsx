import { useEffect } from 'react';
import type { Material } from 'three';
import { defineFeature, useFeature, useFeatureEnabled, useViewerState } from '@schablone/3d-studio-core';

export interface WireframeConfig {
  /** Initial state of the toggle. */
  enabled: boolean;
}

type WireframeMaterial = Material & { wireframe?: boolean };

const WireframeScene = () => {
  useFeature<WireframeConfig>();
  const enabled = useFeatureEnabled();
  const gltf = useViewerState((s) => s.gltf);

  useEffect(() => {
    const touched: WireframeMaterial[] = [];
    gltf?.scene.traverse((object) => {
      const material = (object as { material?: WireframeMaterial | WireframeMaterial[] }).material;
      [material].flat().forEach((m) => m && 'wireframe' in m && touched.push(m));
    });
    touched.forEach((m) => {
      m.wireframe = enabled;
      m.needsUpdate = true;
    });
    return () => touched.forEach((m) => (m.wireframe = false));
  }, [gltf, enabled]);

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
