import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import {
  Box3,
  Sphere,
  PerspectiveCamera,
  Scene,
  type BufferGeometry,
  type Material,
  type Mesh,
  type Camera,
  type ToneMapping,
  type Light,
} from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useViewer, type ViewerStore } from '@schablone/3d-studio-core';

export interface Shot {
  scene: Scene;
  camera: Camera;
  width: number;
  height: number;
  toneMapping: ToneMapping;
  exposure: number;
  dispose: () => void;
}
export const cameras = new WeakMap<ViewerStore, () => Shot>();
export const CaptureSource = () => {
  const viewer = useViewer();
  const get = useThree((s) => s.get);
  useLayoutEffect(() => {
    cameras.set(viewer, () => {
      const { camera, scene, size, gl } = get();
      const model = viewer.getState().gltf?.scene;
      if (!model) throw new Error('Wait for the model to load.');
      const still = new Scene();
      still.environment = scene.environment;
      still.background = scene.background;
      still.environmentRotation.copy(scene.environmentRotation);
      still.backgroundRotation.copy(scene.backgroundRotation);
      still.environmentIntensity = scene.environmentIntensity;
      still.backgroundIntensity = scene.backgroundIntensity;
      const subject = clone(model);
      const geometries = new Map<BufferGeometry, BufferGeometry>();
      const materials = new Map<Material, Material>();
      const materialCopy = (source: Material) => {
        if (!materials.has(source)) materials.set(source, source.clone());
        return materials.get(source)!;
      };
      subject.traverse((object) => {
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        if (!geometries.has(mesh.geometry)) geometries.set(mesh.geometry, mesh.geometry.clone());
        mesh.geometry = geometries.get(mesh.geometry)!;
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(materialCopy) : materialCopy(mesh.material);
      });
      const dispose = () => {
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
      };
      model.updateWorldMatrix(true, true);
      model.matrixWorld.decompose(subject.position, subject.quaternion, subject.scale);
      still.add(subject);
      const visitLight = (object: import('three').Object3D) => {
        if (object === model || !object.visible) return;
        if ((object as Light).isLight) {
          const light = object.clone(false);
          object.updateWorldMatrix(true, false);
          object.matrixWorld.decompose(light.position, light.quaternion, light.scale);
          still.add(light);
        }
        object.children.forEach(visitLight);
      };
      scene.children.forEach(visitLight);
      const lens = camera.clone();
      camera.updateWorldMatrix(true, false);
      camera.matrixWorld.decompose(lens.position, lens.quaternion, lens.scale);
      if (lens instanceof PerspectiveCamera) {
        const bounds = new Box3().setFromObject(subject).getBoundingSphere(new Sphere());
        lens.far = Math.min(
          lens.far,
          Math.max(lens.near * 2, lens.position.distanceTo(bounds.center) + bounds.radius * 2),
        );
        lens.updateProjectionMatrix();
      }
      lens.updateMatrixWorld();
      return {
        dispose,
        scene: still,
        camera: lens,
        width: Math.max(1, Math.round(size.width)),
        height: Math.max(1, Math.round(size.height)),
        toneMapping: gl.toneMapping,
        exposure: gl.toneMappingExposure,
      };
    });
    return () => {
      cameras.delete(viewer);
    };
  }, [viewer, get]);
  return null;
};
