import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { type Intersection, type Object3D, Raycaster, Vector2, Vector3 } from 'three';
import { useViewerState } from '../store';

export type PickVector = [number, number, number];

/** A click on the model: the surface point and normal in world space and the object that was hit. */
export interface ModelPick {
  point: PickVector;
  normal: PickVector;
  object: Object3D;
  /** Shift, Ctrl or Meta was held, e.g. to extend a selection. */
  additive: boolean;
}

const CLICK_TOLERANCE_PX = 4;

const isShown = (object: Object3D | null): boolean => {
  for (let node = object; node; node = node.parent) {
    if (!node.visible) return false;
  }
  return true;
};

/** Converts a raycaster hit into a pick; faces without a normal point up. */
export const pickFromIntersection = (hit: Intersection, additive = false): ModelPick => {
  const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new Vector3(0, 1, 0);
  return { point: hit.point.toArray(), normal: normal.toArray(), object: hit.object, additive };
};

/**
 * Reports clicks on the loaded model (not drags) with the surface point and normal.
 * Use inside a feature `scene`; pass `undefined` to stop listening.
 */
export const useModelPick = (onPick: ((pick: ModelPick) => void) | undefined): void => {
  const gltf = useViewerState((s) => s.gltf);
  const get = useThree((state) => state.get);
  const canvas = useThree((state) => state.gl.domElement);
  const handler = useRef(onPick);
  handler.current = onPick;
  const listening = Boolean(onPick);

  useEffect(() => {
    const root = gltf?.scene;
    if (!root || !listening) return undefined;
    const raycaster = new Raycaster();
    const origin = { x: 0, y: 0 };
    const down = (event: PointerEvent) => {
      origin.x = event.clientX;
      origin.y = event.clientY;
    };
    const up = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > CLICK_TOLERANCE_PX) return;
      const bounds = canvas.getBoundingClientRect();
      const pointer = new Vector2(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, get().camera);
      const hit = raycaster.intersectObject(root, true).find((entry) => isShown(entry.object));
      if (hit) handler.current?.(pickFromIntersection(hit, event.shiftKey || event.ctrlKey || event.metaKey));
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
    };
  }, [gltf, listening, canvas, get]);
};
