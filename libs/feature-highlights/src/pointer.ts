import { Vector3, type Mesh } from 'three';

const up = new Vector3(0, 1, 0);

export const pointerTipRadius = (viewDepth: number, viewportHeight: number, projectionScale: number) =>
  5 * viewDepth / (viewportHeight * projectionScale);

export const updatePointer = (line: Mesh, dot: Mesh, anchor: Vector3, target: Vector3, isVisible: boolean, radius: number) => {
  line.position.subVectors(target, anchor);
  const length = line.position.length();
  if (length) line.quaternion.setFromUnitVectors(up, line.position.normalize());
  line.scale.set(radius, length, radius);
  line.position.addVectors(anchor, target).multiplyScalar(0.5);
  dot.position.copy(target);
  line.visible = isVisible;
  dot.visible = isVisible;
};
