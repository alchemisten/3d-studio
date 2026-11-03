import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { defineFeature, useFeature, useFeatureEnabled } from '@schablone/3d-studio-core';

export interface CameraRotationConfig {
  /** Initial state of the toggle. */
  enabled: boolean;
  /** Orbit controls `autoRotateSpeed`; 2 is about 30 s per revolution at 60 fps. */
  speed: number;
}

interface AutoRotateControls {
  autoRotate: boolean;
  autoRotateSpeed: number;
}

const CameraRotationScene = () => {
  const { config } = useFeature<CameraRotationConfig>();
  const enabled = useFeatureEnabled();
  const controls = useThree((s) => s.controls) as unknown as AutoRotateControls | null;

  useEffect(() => {
    if (!controls) {
      return undefined;
    }
    controls.autoRotate = enabled;
    controls.autoRotateSpeed = config.speed;
    return () => {
      controls.autoRotate = false;
    };
  }, [controls, enabled, config.speed]);

  return null;
};

/** Needs the default controls (`<Viewer controls>`) or controls registered with `makeDefault`. */
export const cameraRotation = defineFeature<CameraRotationConfig>({
  id: 'camera-rotation',
  defaults: { enabled: false, speed: 2 },
  gltf: { extension: 'ALCM_camera_rotation' },
  toggle: { label: 'Rotate camera' },
  scene: CameraRotationScene,
});
