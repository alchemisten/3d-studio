import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Outlines } from '@react-three/drei';
import { MeshBasicMaterial, type Mesh, type Object3D } from 'three';
import type { Highlight } from './highlight-model';

const Silhouette = ({ source, color }: { source: Mesh; color: string }) => {
  const proxy = useMemo(() => {
    const mesh = source.clone(false);
    mesh.material = new MeshBasicMaterial({ visible: false });
    mesh.morphTargetInfluences = source.morphTargetInfluences;
    mesh.matrixAutoUpdate = false;
    return mesh;
  }, [source]);
  useEffect(() => () => (proxy.material as MeshBasicMaterial).dispose(), [proxy]);
  useFrame(() => {
    source.updateWorldMatrix(true, false);
    proxy.matrix.copy(source.matrixWorld);
    proxy.matrixWorldNeedsUpdate = true;
    proxy.visible = true;
    for (let node: Object3D | null = source; node; node = node.parent) {
      if (!node.visible) {
        proxy.visible = false;
        break;
      }
    }
  });
  return (
    <primitive object={proxy} dispose={null}>
      <Outlines color={color} thickness={2.5} angle={0} toneMapped={false} />
    </primitive>
  );
};

export const HoverOutline = ({ highlight, model }: { highlight: Highlight; model: Object3D }) => {
  const meshes = useMemo(() => {
    const target = highlight.target ?? highlight.anchor;
    const nodes = highlight.nodes?.length ? highlight.nodes : 'node' in target ? [target.node] : [];
    const result = new Set<Mesh>();
    for (const name of nodes)
      model.getObjectByName(name)?.traverse((object) => {
        const mesh = object as Mesh;
        if (mesh.isMesh) result.add(mesh);
      });
    return [...result];
  }, [highlight, model]);
  const color = (typeof highlight.pointer === 'object' && highlight.pointer.color) || highlight.color || '#ffffff';
  return (
    <>
      {meshes.map((mesh) => (
        <Silhouette key={mesh.uuid} source={mesh} color={color} />
      ))}
    </>
  );
};
