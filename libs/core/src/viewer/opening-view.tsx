import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';

export interface OpeningCamera {
  position: [number, number, number];
  target: [number, number, number];
}

export const OpeningView = ({ shot }: { shot: OpeningCamera }) => {
  const get = useThree((state) => state.get);
  const controls = useThree((state) => state.controls) as { target: Vector3; update: () => void } | null;
  useLayoutEffect(() => {
    const { camera, invalidate } = get();
    if (!(camera instanceof PerspectiveCamera)) return;
    const target = new Vector3(...shot.target);
    camera.position.fromArray(shot.position).sub(target).multiplyScalar(Math.max(1, 1 / camera.aspect)).add(target);
    const distance = camera.position.distanceTo(target);
    camera.near = Math.max(0.000001, distance / 1000);
    camera.far = Math.max(camera.far, distance * 100);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    controls?.target.copy(target);
    controls?.update();
    invalidate();
  }, [get, controls, shot]);
  return null;
};

export const PreviewLights = () => (
  <>
    <ambientLight intensity={1.8} />
    <directionalLight position={[4, 6, 5]} intensity={2.5} />
  </>
);
