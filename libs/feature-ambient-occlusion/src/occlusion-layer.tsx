import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  type Camera,
  MeshBasicMaterial,
  type Object3D,
  type Scene,
  Sphere,
  Vector2,
  Vector4,
  type WebGLRenderer,
} from 'three';
import { type OcclusionLevel, occlusionQuality } from './occlusion-level';
import { createOcclusionRenderer } from './occlusion-renderer';
import { createRestTracker } from './rest-tracker';

const REST_DELAY_MS = 140;
const FADE_MS = 180;
/** Change of the camera per frame below which it counts as still: rotation in radians, travel in model sizes. */
const STILL_TOLERANCE = 5e-4;
/** Drawn before every other blended object, so helpers and overlays come after the occlusion. */
const FIRST_BLENDED = -1e9;

export interface OcclusionLayerProps {
  model: Object3D;
  /** Changes when the model was changed in place: its size is measured again. */
  revision?: number;
  level: Exclude<OcclusionLevel, 'off'>;
  intensity: number;
  /** Reach of the occlusion as a share of the model's size. */
  radius: number;
  whenResting: boolean;
}

const modelSize = (model: Object3D): number => {
  const bounds = new Box3().setFromObject(model);
  return bounds.isEmpty() ? 1 : bounds.getBoundingSphere(new Sphere()).radius * 2;
};

/**
 * Darkens the creases of the model while the canvas draws its frame. It renders an invisible mesh whose
 * turn in the draw order, right after the opaque objects, is where the occlusion is multiplied onto the
 * model. Mount it only while the effect is wanted: it owns the occlusion buffers.
 */
export const OcclusionLayer = ({ model, revision = 0, level, intensity, radius, whenResting }: OcclusionLayerProps) => {
  const invalidate = useThree((state) => state.invalidate);
  const canvas = useThree((state) => state.gl.domElement);
  const occlusion = useMemo(createOcclusionRenderer, []);
  const tracker = useMemo(() => createRestTracker(REST_DELAY_MS, STILL_TOLERANCE), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const size = useMemo(() => modelSize(model), [model, revision]);
  const anchor = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(9), 3));
    const material = new MeshBasicMaterial({
      transparent: true,
      colorWrite: false,
      depthWrite: false,
      depthTest: false,
    });
    return { geometry, material };
  }, []);
  const scratch = useMemo(() => ({ pose: new Float64Array(32), buffer: new Vector2(), viewport: new Vector4() }), []);
  const isInteracting = useRef(false);
  const isDrawing = useRef(false);
  const restTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      occlusion.dispose();
      anchor.geometry.dispose();
      anchor.material.dispose();
    },
    [occlusion, anchor],
  );

  useEffect(() => {
    invalidate();
    return () => invalidate();
  }, [invalidate, model, revision, level, intensity, radius, whenResting]);

  useEffect(() => {
    const start = () => {
      isInteracting.current = true;
    };
    const end = () => {
      isInteracting.current = false;
      invalidate();
    };
    canvas.addEventListener('pointerdown', start);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      canvas.removeEventListener('pointerdown', start);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      clearTimeout(restTimer.current);
    };
  }, [canvas, invalidate]);

  /** Asks for the next frame right after this one: a request made while a frame is drawn is not reliably kept. */
  const requestFrame = () => queueMicrotask(() => invalidate());

  const draw = (renderer: WebGLRenderer, scene: Scene, camera: Camera) => {
    if (isDrawing.current || scene.overrideMaterial || renderer.getRenderTarget() || renderer.xr.isPresenting) return;
    const buffer = renderer.getDrawingBufferSize(scratch.buffer);
    const viewport = renderer.getCurrentViewport(scratch.viewport);
    const isWholeCanvas = viewport.x === 0 && viewport.y === 0 && viewport.z === buffer.x && viewport.w === buffer.y;
    if (!isWholeCanvas || renderer.getScissorTest()) return;

    scratch.pose.set(camera.matrixWorld.elements, 0);
    scratch.pose.set(camera.projectionMatrix.elements, 16);
    for (let axis = 12; axis < 15; axis += 1) scratch.pose[axis] /= size;
    const rest = tracker.update(scratch.pose, performance.now(), isInteracting.current);
    let strength = 1;
    if (whenResting) {
      clearTimeout(restTimer.current);
      if (!rest.isResting) {
        if (rest.hasMoved) requestFrame();
        else if (!isInteracting.current) restTimer.current = setTimeout(invalidate, rest.wait + 1);
        return;
      }
      const progress = Math.min(1, rest.restedFor / FADE_MS);
      strength = progress * progress * (3 - 2 * progress);
      if (progress < 1) requestFrame();
    }

    isDrawing.current = true;
    try {
      occlusion.render({
        renderer,
        camera,
        model,
        width: buffer.x,
        height: buffer.y,
        quality: occlusionQuality[level],
        radius: radius * size,
        intensity,
        strength,
      });
    } finally {
      isDrawing.current = false;
    }
  };

  return (
    <mesh
      geometry={anchor.geometry}
      material={anchor.material}
      frustumCulled={false}
      renderOrder={FIRST_BLENDED}
      raycast={() => null}
      onBeforeRender={draw}
    />
  );
};
