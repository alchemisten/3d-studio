import { Mesh, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { updatePointer } from './pointer';

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
