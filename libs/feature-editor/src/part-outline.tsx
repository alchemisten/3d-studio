import { useEffect, useMemo } from 'react';
import { Outlines } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { type Mesh, MeshBasicMaterial, type Object3D } from 'three';

/** Marks scene objects that belong to the editor, so they are left out of rendered shots. */
export const EDITOR_HELPER = { dsEditorHelper: true } as const;

const OUTLINE_LIMIT = 150;
const FILL_OPACITY = 0.22;

const meshesOf = (objects: readonly Object3D[]): Mesh[] => {
  const meshes = new Set<Mesh>();
  objects.forEach((object) =>
    object.traverse((node) => {
      if ((node as Mesh).isMesh) meshes.add(node as Mesh);
    }),
  );
  return [...meshes].slice(0, OUTLINE_LIMIT);
};

const Proxy = ({ source, color, fill }: { source: Mesh; color: string; fill: boolean }) => {
  const proxy = useMemo(() => {
    const mesh = source.clone(false);
    mesh.material = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: fill ? FILL_OPACITY : 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    mesh.morphTargetInfluences = source.morphTargetInfluences;
    mesh.matrixAutoUpdate = false;
    mesh.raycast = () => undefined;
    return mesh;
  }, [source, color, fill]);
  useEffect(() => () => (proxy.material as MeshBasicMaterial).dispose(), [proxy]);
  useFrame(() => {
    source.updateWorldMatrix(true, false);
    proxy.matrix.copy(source.matrixWorld);
    proxy.matrixWorldNeedsUpdate = true;
  });
  return (
    <primitive object={proxy} dispose={null}>
      <Outlines color={color} thickness={2.5} angle={0} toneMapped={false} />
    </primitive>
  );
};

export interface PartOutlineProps {
  /** The objects to mark; every mesh beneath them is outlined. */
  objects: readonly Object3D[];
  color: string;
  /** Also tints the parts lightly; leave off where their material must stay readable. */
  fill?: boolean;
}

/** Outlines parts of the model without touching their materials. Use inside the canvas. */
export const PartOutline = ({ objects, color, fill = false }: PartOutlineProps) => {
  const meshes = useMemo(() => meshesOf(objects), [objects]);
  return (
    <group userData={EDITOR_HELPER}>
      {meshes.map((mesh) => (
        <Proxy key={mesh.uuid} source={mesh} color={color} fill={fill} />
      ))}
    </group>
  );
};
