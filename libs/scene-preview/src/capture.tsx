import { useRef, useState } from 'react';
import { FloorSurface } from '@schablone/3d-studio-feature-floor';
import { Environment } from '@react-three/drei';
import { createRoot } from 'react-dom/client';
import { useFrame } from '@react-three/fiber';
import { AnimationMixer, Box3, Color, LoopOnce, PerspectiveCamera, Sphere, Vector3 } from 'three';
import { PreviewLights, Viewer, useViewerState } from '@schablone/3d-studio-core';
import type { CaptureJob } from './descriptor';

declare global {
  interface Window {
    captureJob: CaptureJob;
    captureResult?: { png: string } | { error: string };
  }
}

const { source, draco, environment, preview } = window.captureJob;
const Capture = () => {
  const gltf = useViewerState((state) => state.gltf);
  const [prepared, setPrepared] = useState(false);
  const shadowReady = useRef(false);
  useFrame(({ gl, scene, camera }) => {
    if (!gltf || (environment && !scene.environment) || window.captureResult) return;
    try {
      if (!(camera instanceof PerspectiveCamera)) throw new Error('Expected perspective camera');
      if (!prepared && preview.animation) {
        const clip = gltf.animations.find(({ name }) => name === preview.animation!.clip);
        if (!clip) throw new Error('Available clips: ' + gltf.animations.map(({ name }) => name).join(', '));
        const mixer = new AnimationMixer(gltf.scene);
        const action = mixer.clipAction(clip);
        action.clampWhenFinished = true;
        action.setLoop(LoopOnce, 1).play();
        mixer.setTime(Math.min(clip.duration, preview.animation.time));
      }
      if (preview.floor && preview.floor.mode !== 'off' && !shadowReady.current) {
        if (!prepared) setPrepared(true);
        return;
      }
      const bounds = new Box3().setFromObject(gltf.scene, true).getBoundingSphere(new Sphere());
      const radius = Math.max(bounds.radius, 0.001);
      const halfAngle = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * Math.min(1, camera.aspect));
      const target = preview.camera ? new Vector3(...preview.camera.target) : bounds.center;
      if (preview.camera) camera.position.fromArray(preview.camera.position);
      else
        camera.position
          .set(1, 0.55, 1.35)
          .normalize()
          .multiplyScalar((radius * 1.08) / Math.sin(halfAngle))
          .add(target);
      const distance = camera.position.distanceTo(bounds.center);
      camera.near = Math.max(radius * 0.0001, distance - radius * 1.1);
      camera.far = distance + radius * 2;
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      if (!environment) scene.background = preview.background ? new Color(preview.background) : null;
      gl.render(scene, camera);
      window.captureResult = { png: gl.domElement.toDataURL('image/png') };
    } catch (error) {
      window.captureResult = { error: String(error) };
    }
  }, 1);
  return prepared && gltf && preview.floor && preview.floor.mode !== 'off'
    ? <FloorSurface model={gltf.scene} {...preview.floor} onShadowReady={() => { shadowReady.current = true; }} />
    : null;
};

createRoot(document.getElementById('root')!).render(
  <Viewer
    source={source}
    draco={draco}
    controls={false}
    viewOptions={false}
    canvas={{ dpr: 1 }}
    canvasChildren={
      <>
        <PreviewLights />
        {environment && <Environment files={environment} background backgroundBlurriness={0.45} />}
        <Capture />
      </>
    }
  />,
);
