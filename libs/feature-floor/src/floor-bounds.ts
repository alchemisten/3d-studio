import { Box3, type Object3D, Vector3 } from 'three';

export const floorBounds = (model: Object3D) => {
  const box = new Box3().setFromObject(model, true);
  if (box.isEmpty()) return null;
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const span = Math.max(size.x, size.z, size.y * 0.1, 0.0001);
  return { x: center.x, z: center.z, y: box.min.y - span * 0.001, span, depth: Math.max(span * 0.12, size.y * 0.2) };
};
