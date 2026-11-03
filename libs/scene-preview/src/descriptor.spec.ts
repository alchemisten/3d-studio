import { expect, it } from 'vitest';
import { sceneDescriptor } from './descriptor';

it('fills preview dimensions when preview is omitted or partial', () => {
  expect(sceneDescriptor.parse({ source: 'model.glb' }).preview).toEqual({ width: 960, height: 540 });
  expect(sceneDescriptor.parse({ source: 'model.glb', preview: { width: 320 } }).preview).toEqual({
    width: 320,
    height: 540,
  });
});
