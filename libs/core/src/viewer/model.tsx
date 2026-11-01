import { useEffect } from 'react';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Bounds, OrbitControls, useGLTF } from '@react-three/drei';
import { useViewer } from '../store';

export interface ModelProps {
  url: string;
  /** Draco decoder location. Defaults to drei's CDN. Pass `false` to disable Draco. */
  draco?: string | boolean;
}

/** Loads the glTF (suspends), reports it to the viewer store and fits the camera. */
export const Model = ({ url, draco = true }: ModelProps) => {
  const viewer = useViewer();
  const gltf = useGLTF(url, draco) as unknown as GLTF;

  useEffect(() => {
    viewer.setState({ status: 'ready', gltf, error: undefined });
    viewer.emit('model:loaded', { gltf });
  }, [gltf, viewer]);

  return (
    <Bounds fit clip observe margin={1.2}>
      <primitive object={gltf.scene} />
    </Bounds>
  );
};

export const DefaultControls = () => <OrbitControls makeDefault enableDamping />;
