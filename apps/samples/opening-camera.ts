import type { OpeningCamera } from '@schablone/3d-studio-core';

const vector = (values: number[]): OpeningCamera['position'] => {
  if (values.length !== 3 || !values.every(Number.isFinite)) throw new RangeError('Expected three camera coordinates');
  return [values[0], values[1], values[2]];
};

export const openingCamera = (shot: { position: number[]; target: number[] }): OpeningCamera => ({
  position: vector(shot.position),
  target: vector(shot.target),
});
