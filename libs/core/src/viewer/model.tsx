import { useEffect, useMemo } from 'react';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AnimationClip, Group, Material, Mesh, Object3D } from 'three';
import type { GLTF, GLTFParser } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Bounds, OrbitControls, useBounds, useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { OpeningView, type OpeningCamera } from './opening-view';
import { useViewer } from '../store';

export interface ModelProps {
  url: string;
  waitForSceneFrame?: boolean;
  openingCamera?: OpeningCamera;
  /** Draco decoder location. Defaults to drei's CDN. Pass `false` to disable Draco. */
  draco?: string | boolean;
}

/** A scene the host built and keeps changing itself; the viewer shows it without cloning or disposing it. */
export interface ViewerModel {
  scene: Object3D;
  /** Clips for the animation feature. Keep the array stable: a new one is published as a new model. */
  animations?: AnimationClip[];
}

export interface HostModelProps {
  model: ViewerModel;
  openingCamera?: OpeningCamera;
}

const NO_CLIPS: AnimationClip[] = [];

/** The glTF shape features read from the store, for a scene that never came out of a loader. */
export const modelAsGltf = ({ scene, animations = NO_CLIPS }: ViewerModel): GLTF => ({
  scene: scene as Group,
  scenes: [scene as Group],
  animations,
  cameras: [],
  asset: { version: '2.0' },
  userData: {},
  parser: { json: {} } as GLTFParser,
});

/** Refits the camera when a change of the model asks for it and draws a frame for every change. */
const ModelChanges = () => {
  const viewer = useViewer();
  const bounds = useBounds();
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const changes = viewer.on$('model:changed').subscribe(({ fit }) => {
      if (fit) bounds.refresh().clip().fit();
      invalidate();
    });
    return () => changes.unsubscribe();
  }, [viewer, bounds, invalidate]);
  return null;
};

const ModelStage = ({ scene, openingCamera }: { scene: Object3D; openingCamera?: OpeningCamera }) => (
  <Bounds fit={!openingCamera} clip={!openingCamera} observe={!openingCamera} margin={1.2}>
    <primitive object={scene} dispose={null} />
    {openingCamera && <OpeningView shot={openingCamera} />}
    <ModelChanges />
  </Bounds>
);

/**
 * Shows a model the host owns and reports it to the viewer store like a loaded glTF. The scene is added
 * as it is and only taken out of the scene graph again when it is replaced or the viewer unmounts.
 */
export const HostModel = ({ model: { scene, animations }, openingCamera }: HostModelProps) => {
  const viewer = useViewer();
  const gltf = useMemo(() => modelAsGltf({ scene, animations }), [scene, animations]);

  useEffect(() => {
    viewer.setState({ status: 'ready', gltf, error: undefined });
    viewer.emit('model:loaded', { gltf });
  }, [gltf, viewer]);

  return <ModelStage scene={scene} openingCamera={openingCamera} />;
};

/** Loads the glTF (suspends), reports it to the viewer store and fits the camera. */
export const Model = ({ url, draco = true, openingCamera, waitForSceneFrame = false }: ModelProps) => {
  const viewer = useViewer();
  const source = useGLTF(url, draco) as unknown as GLTF;
  const { gltf, materials } = useMemo(() => {
    const materials = new Map<Material, Material>();
    const localMaterial = (original: Material) => {
      const cached = materials.get(original);
      if (cached) return cached;
      const local = original.clone();
      materials.set(original, local);
      return local;
    };
    const scenes = source.scenes.map((original) => {
      const scene = clone(original) as Group;
      scene.traverse((node) => {
        const mesh = node as Mesh;
        if (mesh.material)
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map(localMaterial)
            : localMaterial(mesh.material);
      });
      return scene;
    });
    return { gltf: { ...source, scenes, scene: scenes[source.scenes.indexOf(source.scene)] }, materials };
  }, [source]);

  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  useEffect(() => {
    viewer.setState({ status: waitForSceneFrame ? 'loading' : 'ready', gltf, error: undefined });
    viewer.emit('model:loaded', { gltf });
  }, [gltf, viewer, waitForSceneFrame]);

  return <ModelStage scene={gltf.scene} openingCamera={openingCamera} />;
};

export const DefaultControls = () => <OrbitControls makeDefault enableDamping />;
