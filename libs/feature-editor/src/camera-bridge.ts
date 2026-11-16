import { useEffect } from 'react';
import { type RootState, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';
import { type OpeningCamera, useViewer, type ViewerStore } from '@schablone/3d-studio-core';

export type Vec3 = [number, number, number];

export interface CameraPose {
  position: Vec3;
  /** World-space point the camera looks at. */
  target: Vec3;
  fov: number;
  /** Width over height of the view. */
  aspect: number;
}

export interface CameraMove {
  position: Vec3;
  target: Vec3;
  fov?: number;
}

/** Reads and moves the camera of a viewer from outside its canvas. */
export interface EditorCamera {
  /** The current camera; `undefined` for non-perspective cameras. */
  capture: () => CameraPose | undefined;
  move: (pose: CameraMove) => void;
  /** Eases the camera to a pose within `duration` milliseconds. */
  flyTo: (pose: CameraMove, duration?: number) => void;
  /** Requests a frame, for canvases that only render on demand. */
  invalidate: () => void;
  /** Switches the orbit controls on or off, e.g. while a handle is dragged. */
  setOrbitEnabled: (enabled: boolean) => void;
  /** The react-three-fiber state of the canvas: camera, scene, renderer, size. */
  three: () => RootState;
}

interface OrbitLike {
  target: Vector3;
  enabled: boolean;
  update: () => void;
}

const cameras = new WeakMap<ViewerStore, readonly EditorCamera[]>();

/** The camera of a viewer, available while an editor feature's scene is mounted. */
export const editorCameraOf = (viewer: ViewerStore): EditorCamera | undefined => cameras.get(viewer)?.at(-1);

/**
 * The opening camera that reproduces a captured pose. The viewer pulls opening shots back on portrait
 * views (`1 / aspect`), so the captured distance is shortened by the same factor.
 */
export const openingCameraOf = ({ position, target, aspect }: CameraPose): OpeningCamera => {
  const pullBack = Math.max(1, 1 / aspect);
  return {
    position: position.map((value, axis) => target[axis] + (value - target[axis]) / pullBack) as Vec3,
    target,
  };
};

const FLY_DURATION_MS = 450;

const easeInOut = (progress: number) => progress * progress * (3 - 2 * progress);

/** Registers the canvas camera for `editorCameraOf`. Call inside a feature `scene`. */
export const useCameraBridge = (): void => {
  const viewer = useViewer();
  const get = useThree((state) => state.get);

  useEffect(() => {
    const orbit = () => get().controls as unknown as OrbitLike | null;
    const flight = { frame: 0 };
    const capture = (): CameraPose | undefined => {
      const { camera } = get();
      if (!(camera instanceof PerspectiveCamera)) return undefined;
      return {
        position: camera.position.toArray(),
        target: (orbit()?.target ?? new Vector3()).toArray(),
        fov: camera.fov,
        aspect: camera.aspect,
      };
    };
    const move = ({ position, target, fov }: CameraMove) => {
      const { camera, invalidate } = get();
      camera.position.fromArray(position);
      if (fov !== undefined && camera instanceof PerspectiveCamera) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      const controls = orbit();
      controls?.target.fromArray(target);
      controls?.update();
      camera.lookAt(...target);
      invalidate();
    };
    const handle: EditorCamera = {
      capture,
      move,
      flyTo: (pose, duration = FLY_DURATION_MS) => {
        cancelAnimationFrame(flight.frame);
        const from = capture();
        if (!from || duration <= 0) {
          move(pose);
          return;
        }
        const start = performance.now();
        const origin = { position: new Vector3(...from.position), target: new Vector3(...from.target) };
        const goal = { position: new Vector3(...pose.position), target: new Vector3(...pose.target) };
        const tick = (now: number) => {
          const progress = easeInOut(Math.min(1, (now - start) / duration));
          move({
            position: origin.position.clone().lerp(goal.position, progress).toArray(),
            target: origin.target.clone().lerp(goal.target, progress).toArray(),
            fov: from.fov + ((pose.fov ?? from.fov) - from.fov) * progress,
          });
          if (progress < 1) flight.frame = requestAnimationFrame(tick);
        };
        flight.frame = requestAnimationFrame(tick);
      },
      invalidate: () => get().invalidate(),
      setOrbitEnabled: (enabled) => {
        const controls = orbit();
        if (controls) controls.enabled = enabled;
      },
      three: get,
    };
    cameras.set(viewer, [...(cameras.get(viewer) ?? []), handle]);
    return () => {
      cancelAnimationFrame(flight.frame);
      cameras.set(
        viewer,
        (cameras.get(viewer) ?? []).filter((entry) => entry !== handle),
      );
    };
  }, [viewer, get]);
};
