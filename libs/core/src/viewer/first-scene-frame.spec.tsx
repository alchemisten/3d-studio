import { render } from '@testing-library/react';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { expect, it, vi } from 'vitest';
import { FirstSceneFrame } from './first-scene-frame';

const model = {} as GLTF;
const previous = vi.fn();
const scene = { onAfterRender: previous };
const invalidate = vi.fn();
const viewer = { getState: () => ({ gltf: model }), setState: vi.fn() };

vi.mock('@react-three/fiber', () => ({ useThree: () => ({ scene, invalidate }) }));
vi.mock('../store', () => ({ useViewer: () => viewer }));

it('reveals the parsed model only after its first scene render', () => {
  render(<FirstSceneFrame model={model} />);
  expect(invalidate).toHaveBeenCalledOnce();
  expect(viewer.setState).not.toHaveBeenCalled();
  scene.onAfterRender();
  expect(previous).toHaveBeenCalledOnce();
  expect(viewer.setState).toHaveBeenCalledWith({ status: 'ready' });
  expect(scene.onAfterRender).toBe(previous);
});
