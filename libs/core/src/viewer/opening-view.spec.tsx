import { render } from '@testing-library/react';
import { PerspectiveCamera, Vector3 } from 'three';
import { expect, it, vi } from 'vitest';
import { OpeningView } from './opening-view';

const camera = new PerspectiveCamera();
const controls = { target: new Vector3(), update: vi.fn() };
const invalidate = vi.fn();

vi.mock('@react-three/fiber', () => ({
  useThree: (select: (state: unknown) => unknown) => select({ controls, get: () => ({ camera, invalidate }) }),
}));

it.each<[number, number[]]>([
  [2, [6, 4, 10]],
  [0.5, [10, 6, 16]],
])('frames the authored target at aspect %s', (aspect, expected) => {
  camera.aspect = aspect;
  render(<OpeningView shot={{ position: [6, 4, 10], target: [2, 2, 4] }} />);
  expect(camera.position.toArray()).toEqual(expected);
  expect(controls.target.toArray()).toEqual([2, 2, 4]);
  expect(camera.getWorldDirection(new Vector3()).distanceTo(new Vector3(-4, -2, -6).normalize())).toBeLessThan(1e-10);
});
