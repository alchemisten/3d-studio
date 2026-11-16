import type { RootState } from '@react-three/fiber';
import { Box3, type Intersection, type Object3D, Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { Vec3 } from './camera-bridge';

export interface ScreenPoint {
  x: number;
  y: number;
  /** In front of the camera. */
  visible: boolean;
}

const isShown = (object: Object3D | null): boolean => {
  for (let node = object; node; node = node.parent) {
    if (!node.visible) return false;
  }
  return true;
};

const pointerRay = (state: RootState, clientX: number, clientY: number): Raycaster => {
  const bounds = state.gl.domElement.getBoundingClientRect();
  const raycaster = new Raycaster();
  raycaster.setFromCamera(
    new Vector2(((clientX - bounds.left) / bounds.width) * 2 - 1, -((clientY - bounds.top) / bounds.height) * 2 + 1),
    state.camera,
  );
  return raycaster;
};

/** The nearest visible hit of the model under a pointer; helpers and handles are never hit. */
export const raycastModel = (
  state: RootState,
  model: Object3D,
  clientX: number,
  clientY: number,
): Intersection | undefined =>
  pointerRay(state, clientX, clientY)
    .intersectObject(model, true)
    .find((hit) => isShown(hit.object));

/** The world-space normal of a hit; faces without one point up. */
export const hitNormal = (hit: Intersection): Vec3 =>
  hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).toArray() : [0, 1, 0];

/** Where a world point shows in the canvas, in CSS pixels from its top-left corner. */
export const projectToScreen = (state: RootState, point: Vec3): ScreenPoint => {
  const projected = new Vector3(...point).project(state.camera);
  return {
    x: (projected.x * 0.5 + 0.5) * state.size.width,
    y: (-projected.y * 0.5 + 0.5) * state.size.height,
    visible: projected.z < 1,
  };
};

/** The point under a pointer on the plane that faces the camera and contains `through`. */
export const viewPlanePoint = (state: RootState, clientX: number, clientY: number, through: Vec3): Vec3 | undefined => {
  const normal = state.camera.getWorldDirection(new Vector3());
  const plane = new Plane().setFromNormalAndCoplanarPoint(normal, new Vector3(...through));
  return pointerRay(state, clientX, clientY).ray.intersectPlane(plane, new Vector3())?.toArray();
};

/** The diagonal of the model's bounding box; 1 for an empty model. */
export const modelSizeOf = (model: Object3D | undefined): number =>
  model ? new Box3().setFromObject(model).getSize(new Vector3()).length() || 1 : 1;

/**
 * The surface under a point that lies on or near the model: a ray from outside the model through the point
 * towards the model's centre, taking the hit nearest to the point.
 */
export const surfaceAt = (model: Object3D, point: Vec3): Intersection | undefined => {
  const box = new Box3().setFromObject(model);
  const centre = box.getCenter(new Vector3());
  const radius = box.getSize(new Vector3()).length();
  const at = new Vector3(...point);
  const outward = at.clone().sub(centre);
  if (outward.lengthSq() === 0) outward.set(0, 1, 0);
  outward.normalize();
  const origin = at.clone().addScaledVector(outward, radius);
  const hits = new Raycaster(origin, outward.clone().negate())
    .intersectObject(model, true)
    .filter((hit) => isShown(hit.object));
  return hits.reduce<Intersection | undefined>(
    (nearest, hit) => (!nearest || hit.point.distanceTo(at) < nearest.point.distanceTo(at) ? hit : nearest),
    undefined,
  );
};
