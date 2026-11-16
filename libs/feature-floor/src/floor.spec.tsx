import { act, createRoot, extend, type RootState } from '@react-three/fiber';
import * as THREE from 'three';
import { BoxGeometry, Group, Mesh, type PlaneGeometry, type WebGLRenderer } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { FeatureReactContext, resolveFeatureConfig, ViewerContext, ViewerStore } from '@schablone/3d-studio-core';
import { floor } from './floor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
extend(THREE as unknown as Parameters<typeof extend>[0]);

let unmount: (() => Promise<void>) | undefined;

afterEach(async () => {
  await unmount?.();
  unmount = undefined;
});

const mountFloor = async (store: ViewerStore) => {
  const canvas = document.createElement('canvas');
  const renderer = {
    domElement: canvas,
    render: vi.fn(),
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    shadowMap: {},
    xr: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
  } as unknown as WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: () => renderer, frameloop: 'never', size: { width: 800, height: 600, top: 0, left: 0 } });
  const Scene = floor.scene;
  if (!Scene) throw new Error('The floor feature has no scene.');
  const context = {
    id: floor.id,
    viewer: store,
    overlay: {} as never,
    config: resolveFeatureConfig({ feature: floor }),
  };
  let state!: RootState;
  await act(async () => {
    state = root
      .render(
        <ViewerContext.Provider value={store}>
          <FeatureReactContext.Provider value={context}>
            <Scene />
          </FeatureReactContext.Provider>
        </ViewerContext.Provider>,
      )
      .getState();
  });
  unmount = () => act(async () => root.unmount());
  return state;
};

const floorWidth = (state: RootState): number | undefined => {
  let width: number | undefined;
  state.scene.traverse((object) => {
    const geometry = (object as Mesh).geometry as PlaneGeometry | undefined;
    if (geometry?.type === 'PlaneGeometry') width = geometry.parameters.width;
  });
  return width;
};

it('fits the floor again when the host announces a change of the model', async () => {
  const store = new ViewerStore();
  const scene = new Group();
  const part = new Mesh(new BoxGeometry(2, 1, 1));
  scene.add(part);
  store.setState({ status: 'ready', gltf: { scene, animations: [] } as never });
  const state = await mountFloor(store);
  expect(floorWidth(state)).toBeCloseTo(13);

  part.scale.setScalar(3);
  await act(async () => store.setFeatureState('other', 1));
  expect(floorWidth(state)).toBeCloseTo(13);

  await act(async () => store.notifyModelChanged());
  expect(floorWidth(state)).toBeCloseTo(39);
});
