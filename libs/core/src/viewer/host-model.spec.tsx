import { act, createRoot, extend, type RootState } from '@react-three/fiber';
import * as THREE from 'three';
import {
  AnimationClip,
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  type WebGLRenderer,
} from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useViewerState, ViewerContext, ViewerStore } from '../store';
import { HostModel, modelAsGltf, type ViewerModel } from './model';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
extend(THREE as unknown as Parameters<typeof extend>[0]);

const box = (size: number, name = 'Box') => {
  const mesh = new Mesh(new BoxGeometry(size, size, size), new MeshStandardMaterial());
  mesh.name = name;
  vi.spyOn(mesh.geometry, 'dispose');
  vi.spyOn(mesh.material, 'dispose');
  const scene = new Group();
  scene.add(mesh);
  return { scene, mesh };
};

const isShown = (object: Object3D, state: RootState): boolean => {
  for (let node: Object3D | null = object; node; node = node.parent) if (node === state.scene) return true;
  return false;
};

const mount = async (store: ViewerStore) => {
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
  await root.configure({
    gl: () => renderer,
    frameloop: 'never',
    size: { width: 800, height: 600, top: 0, left: 0 },
  });
  let state!: RootState;
  const seen: Array<GLTF | undefined> = [];
  const Probe = () => {
    seen.push(useViewerState((s) => s.gltf));
    return null;
  };
  const show = async (model: ViewerModel) => {
    await act(async () => {
      state = root
        .render(
          <ViewerContext.Provider value={store}>
            <HostModel model={model} />
            <Probe />
          </ViewerContext.Provider>,
        )
        .getState();
    });
  };
  unmount = () => act(async () => root.unmount());
  return { show, seen, state: () => state };
};

let unmount: (() => Promise<void>) | undefined;

afterEach(async () => {
  await unmount?.();
  unmount = undefined;
});

describe('modelAsGltf', () => {
  it('gives features the glTF fields they read', () => {
    const { scene } = box(1);
    const clip = new AnimationClip('spin', 1, []);
    expect(modelAsGltf({ scene }).animations).toEqual([]);
    const gltf = modelAsGltf({ scene, animations: [clip] });
    expect(gltf.scene).toBe(scene);
    expect(gltf.scenes).toEqual([scene]);
    expect(gltf.animations).toEqual([clip]);
    expect(gltf.parser.json.extensions).toBeUndefined();
  });
});

describe('HostModel', () => {
  it('adds the host scene as it is and publishes it like a loaded glTF', async () => {
    const store = new ViewerStore();
    const loaded: GLTF[] = [];
    store.on$('model:loaded').subscribe(({ gltf }) => loaded.push(gltf));
    const { scene, mesh } = box(1);
    const viewer = await mount(store);
    await viewer.show({ scene });

    const { gltf, status } = store.getState();
    expect(status).toBe('ready');
    expect(gltf?.scene).toBe(scene);
    expect(loaded).toEqual([gltf]);
    expect(viewer.seen.at(-1)).toBe(gltf);
    expect(isShown(scene, viewer.state())).toBe(true);
    expect(scene.children).toEqual([mesh]);
  });

  it('keeps the published model when the same scene is passed again', async () => {
    const store = new ViewerStore();
    const loaded: GLTF[] = [];
    store.on$('model:loaded').subscribe(({ gltf }) => loaded.push(gltf));
    const { scene } = box(1);
    const viewer = await mount(store);
    await viewer.show({ scene });
    const parent = scene.parent;
    const added = vi.fn();
    scene.addEventListener('added', added);
    await viewer.show({ scene });

    expect(loaded).toHaveLength(1);
    expect(scene.parent).toBe(parent);
    expect(added).not.toHaveBeenCalled();
  });

  it('announces an in-place change and keeps the camera unless a fit is asked for', async () => {
    const store = new ViewerStore();
    const { scene, mesh } = box(1);
    const viewer = await mount(store);
    await viewer.show({ scene });
    const { camera } = viewer.state();
    const gltf = store.getState().gltf;
    const changes: boolean[] = [];
    const materialChanges: GLTF[] = [];
    store.on$('model:changed').subscribe(({ fit }) => changes.push(fit));
    store.on$('model:materials-changed').subscribe((event) => materialChanges.push(event.gltf));
    const far = camera.far;

    mesh.scale.setScalar(40);
    await act(async () => store.notifyModelChanged());
    expect(store.getState().modelRevision).toBe(1);
    expect(store.getState().gltf).toBe(gltf);
    expect(changes).toEqual([false]);
    expect(materialChanges).toEqual([gltf]);
    expect(camera.far).toBe(far);

    await act(async () => store.notifyModelChanged({ fit: true }));
    expect(store.getState().modelRevision).toBe(2);
    expect(changes).toEqual([false, true]);
    expect(camera.far).toBeGreaterThan(far * 10);
  });

  it('swaps to another scene and disposes neither, also on unmount', async () => {
    const store = new ViewerStore();
    const first = box(1, 'First');
    const second = box(2, 'Second');
    const viewer = await mount(store);
    await viewer.show({ scene: first.scene });
    await viewer.show({ scene: second.scene });

    expect(store.getState().gltf?.scene).toBe(second.scene);
    expect(isShown(first.scene, viewer.state())).toBe(false);
    expect(isShown(second.scene, viewer.state())).toBe(true);

    await unmount?.();
    unmount = undefined;
    expect(second.scene.parent).toBeNull();
    for (const { mesh } of [first, second]) {
      expect(mesh.parent).not.toBeNull();
      expect(mesh.geometry.dispose).not.toHaveBeenCalled();
      expect(mesh.material.dispose).not.toHaveBeenCalled();
    }
  });
});

describe('ViewerStore.notifyModelChanged', () => {
  it('does nothing without a model', () => {
    const store = new ViewerStore();
    const changed = vi.fn();
    store.on$('model:changed').subscribe(changed);
    store.notifyModelChanged();
    expect(store.getState().modelRevision).toBe(0);
    expect(changed).not.toHaveBeenCalled();
  });
});
