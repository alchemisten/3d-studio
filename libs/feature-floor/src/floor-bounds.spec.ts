import { BoxGeometry, Group, Mesh } from 'three';
import { expect, it } from 'vitest';
import { floorBounds } from './floor-bounds';

it.each([
  [0.25, 12, -6, 4],
  [8, -20, 35, -13],
])('fits the floor to a model scaled by %s at (%s, %s, %s)', (scale, x, y, z) => {
  const model = new Group();
  model.add(new Mesh(new BoxGeometry(6, 4, 2)));
  model.position.set(x, y, z);
  model.scale.setScalar(scale);
  const bounds = floorBounds(model);
  expect(bounds?.x).toBeCloseTo(x);
  expect(bounds?.z).toBeCloseTo(z);
  expect(bounds?.span).toBeCloseTo(6 * scale);
  expect(bounds?.y).toBeCloseTo(y - 2 * scale - 0.006 * scale, 8);
  expect(bounds?.depth).toBeCloseTo(0.8 * scale);
});
