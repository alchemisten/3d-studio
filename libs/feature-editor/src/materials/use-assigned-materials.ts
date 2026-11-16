import { useEffect, useMemo, useRef } from 'react';
import type { Mesh, MeshStandardMaterial, Object3D } from 'three';
import { useViewer, useViewerState } from '@schablone/3d-studio-core';
import { editorCameraOf } from '../camera-bridge';
import { useEditor } from '../editor-context';
import { partKeysOf } from '../editor-nav';
import { useEditorNav } from '../shell/shell-context';
import {
  type MaterialAssignmentConfig,
  materialAssignmentStateOf,
  originalMaterialOf,
  rememberOriginalMaterial,
  resolveLibrary,
} from './material-assignment-state';
import { disposeMaterial, type LibraryMaterial, toThreeMaterial } from './material-library';
import { effectiveMaterial, meshKeyChains } from './object-tree';

/**
 * Shows every mesh with the library material it is assigned or inherits (else its own) and previews a
 * material on the selected parts. Owns and disposes the materials it creates.
 */
export const useAssignedMaterials = (config: MaterialAssignmentConfig): void => {
  const viewer = useViewer();
  const { value } = useEditor();
  const { nav } = useEditorNav();
  const gltf = useViewerState((state) => state.gltf);
  const previewId = useViewerState((state) => materialAssignmentStateOf(state).previewId);
  const { partKeyOf } = config;
  const signature = JSON.stringify(config.library);
  const library = useMemo(
    () => new Map(resolveLibrary(JSON.parse(signature)).map((entry): [string, LibraryMaterial] => [entry.id, entry])),
    [signature],
  );
  const chains = useMemo(
    () => (gltf ? meshKeyChains<Object3D>(gltf.scene, partKeyOf) : new Map<Object3D, string[]>()),
    [gltf, partKeyOf],
  );
  const created = useRef(new Map<string, MeshStandardMaterial>());
  const selection = nav.part;

  useEffect(() => {
    const cache = created.current;
    return () => {
      cache.forEach(disposeMaterial);
      cache.clear();
    };
  }, [library]);

  useEffect(
    () => () =>
      chains.forEach((_chain, object) => {
        const mesh = object as Mesh;
        mesh.material = originalMaterialOf(mesh);
      }),
    [chains],
  );

  useEffect(() => {
    if (!gltf) return;
    const invalidate = () => editorCameraOf(viewer)?.invalidate();
    const materialOf = (entry: LibraryMaterial): MeshStandardMaterial => {
      const known = created.current.get(entry.id) ?? toThreeMaterial(entry, { onTextureLoad: invalidate });
      created.current.set(entry.id, known);
      return known;
    };
    const selected = partKeysOf({ part: selection });
    const wearing = [...chains].map(([object, chain]) => {
      const mesh = object as Mesh;
      const previewed = previewId !== undefined && chain.some((key) => selected.includes(key));
      const id = previewed ? (previewId ?? undefined) : effectiveMaterial(chain, value.materials);
      const entry = id === undefined ? undefined : library.get(id);
      return { mesh, next: entry ? materialOf(entry) : rememberOriginalMaterial(mesh) };
    });
    const changed = wearing.filter(({ mesh, next }) => mesh.material !== next);
    changed.forEach(({ mesh, next }) => {
      rememberOriginalMaterial(mesh);
      mesh.material = next;
    });
    if (changed.length) {
      viewer.emit('model:materials-changed', { gltf });
      invalidate();
    }
  }, [viewer, gltf, chains, library, value.materials, previewId, selection]);
};
