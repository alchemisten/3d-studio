import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useViewer } from '../store';

export const FirstSceneFrame = ({ model }: { model: GLTF }) => {
  const viewer = useViewer();
  const { scene, invalidate } = useThree();
  useLayoutEffect(() => {
    const previous = scene.onAfterRender;
    const rendered: typeof previous = (...args) => {
      previous.call(scene, ...args);
      if (viewer.getState().gltf !== model) return;
      scene.onAfterRender = previous;
      viewer.setState({ status: 'ready' });
    };
    scene.onAfterRender = rendered;
    invalidate();
    return () => {
      if (scene.onAfterRender === rendered) scene.onAfterRender = previous;
    };
  }, [scene, invalidate, model, viewer]);
  return null;
};
