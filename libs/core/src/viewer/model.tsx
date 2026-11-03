import { useEffect, useMemo } from 'react';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Group, Material, Mesh } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Bounds, OrbitControls, useGLTF } from '@react-three/drei';
import { OpeningView, type OpeningCamera } from './opening-view';
import { useViewer } from '../store';

export interface ModelProps {
  url: string;
  waitForSceneFrame?: boolean;
  openingCamera?: OpeningCamera;
  /** Draco decoder location. Defaults to drei's CDN. Pass `false` to disable Draco. */
  draco?: string | boolean;
}

/** Loads the glTF (suspends), reports it to the viewer store and fits the camera. */
export const Model = ({ url, draco = true, openingCamera, waitForSceneFrame = false }: ModelProps) => {
  const viewer = useViewer();
  const source = useGLTF(url, draco) as unknown as GLTF;
  const { gltf, materials } = useMemo(() => {
    const materials = new Map<Material, Material>();
    const localMaterial = (original: Material) => {
      const cached = materials.get(original);
      if (cached) return cached;
      const local = original.clone();
      materials.set(original, local);
      return local;
    };
    const scenes = source.scenes.map((original) => {
      const scene = clone(original) as Group;
      scene.traverse((node) => {
        const mesh = node as Mesh;
        if (mesh.material) mesh.material = Array.isArray(mesh.material) ? mesh.material.map(localMaterial) : localMaterial(mesh.material);
      });
      return scene;
    });
    return { gltf: { ...source, scenes, scene: scenes[source.scenes.indexOf(source.scene)] }, materials };
  }, [source]);

  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  useEffect(() => {
    viewer.setState({ status: waitForSceneFrame ? 'loading' : 'ready', gltf, error: undefined });
    viewer.emit('model:loaded', { gltf });
  }, [gltf, viewer, waitForSceneFrame]);

  if (openingCamera) return <><primitive object={gltf.scene} /><OpeningView shot={openingCamera} /></>;

  return (
    <Bounds fit clip observe margin={1.2}>
      <primitive object={gltf.scene} />
    </Bounds>
  );
};

export const DefaultControls = () => <OrbitControls makeDefault enableDamping />;
