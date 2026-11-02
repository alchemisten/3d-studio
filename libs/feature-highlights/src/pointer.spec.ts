import { Mesh, PerspectiveCamera, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { pointerTipRadius, updatePointer } from './pointer';

it.each([0.3, 5])('projects the tip to five pixels at depth %s', (depth) => {
  const camera = new PerspectiveCamera(45, 1, 0.01, 100);
  const height = 800;
  const radius = pointerTipRadius(depth, height, camera.projectionMatrix.elements[5]);
  const edge = new Vector3(0, radius, -depth).project(camera);
  expect(edge.y * height).toBeCloseTo(5);
});

it('places the ends of the leader at the anchor and target', () => {
  const line = new Mesh();
  const dot = new Mesh();
  const anchor = new Vector3(-1, 2, 3);
  const target = new Vector3(4, 0, 6);

  updatePointer(line, dot, anchor, target, true, 0.01);

  expect(line.localToWorld(new Vector3(0, -0.5, 0)).distanceTo(anchor)).toBeCloseTo(0);
  expect(line.localToWorld(new Vector3(0, 0.5, 0)).distanceTo(target)).toBeCloseTo(0);
  expect(dot.position).toEqual(target);
});

it('hides and restores both pointer objects as visibility changes between frames', () => {
  const line = new Mesh();
  const dot = new Mesh();
  const anchor = new Vector3(1, 2, 3);
  const target = new Vector3(4, 5, 6);

  for (const isVisible of [false, true]) {
    updatePointer(line, dot, anchor, target, isVisible, 0.01);
    expect(line.visible).toBe(isVisible);
    expect(dot.visible).toBe(isVisible);
  }
});
