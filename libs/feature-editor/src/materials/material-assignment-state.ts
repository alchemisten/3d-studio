import type { ReactNode } from 'react';
import { z } from 'zod';
import type { Material, Mesh, Object3D } from 'three';
import type { ViewerState, ViewerStore } from '@schablone/3d-studio-core';
import { type LibraryMaterial, type LibraryMaterialInput, libraryMaterialSchema } from './material-library';
import type { PartKeyOf } from './object-tree';

export const MATERIAL_ASSIGNMENT_ID = 'material-assignment';

/** Id of the sidebar tab of the material assignment. */
export const MATERIALS_TAB_ID = 'materials';

export interface MaterialAssignmentConfig {
  /** The materials that can be assigned. */
  library: LibraryMaterialInput[];
  /** Identity of a scene node in the tree and in the stored assignments. Defaults to its index path. */
  partKeyOf?: PartKeyOf<Object3D>;
  /** Colour of the outline around selected and hovered parts. Defaults to the theme's helper colour. */
  selectionColor?: string;
  /** Shown with the hint of an empty library, e.g. a link to the host's material library. */
  emptyAction?: ReactNode;
}

const librarySchema = z.array(libraryMaterialSchema);

export const materialAssignmentConfig = z.object({
  library: librarySchema.default([]),
  partKeyOf: z.custom<PartKeyOf<Object3D>>((value) => typeof value === 'function').optional(),
  selectionColor: z.string().optional(),
  emptyAction: z.custom<ReactNode>().optional(),
});

/** The host's library with PBR defaults applied. */
export const resolveLibrary = (library: readonly LibraryMaterialInput[]): LibraryMaterial[] =>
  librarySchema.parse(library);

/** View state of the material tab that is neither part of the value nor of the nav. */
export interface MaterialAssignmentState {
  /** Key of the part under the pointer, in the tree or in 3D. */
  hoverKey?: string;
  /** Key of the part a dragged swatch would land on. */
  dropKey?: string;
  /** Material shown on the selection without being assigned: a library id, or `null` for the original. */
  previewId?: string | null;
}

const INITIAL: MaterialAssignmentState = {};

export const materialAssignmentStateOf = (state: ViewerState): MaterialAssignmentState =>
  (state.featureState[MATERIAL_ASSIGNMENT_ID] as MaterialAssignmentState | undefined) ?? INITIAL;

export const patchMaterialAssignmentState = (viewer: ViewerStore, patch: Partial<MaterialAssignmentState>): void => {
  const current = materialAssignmentStateOf(viewer.getState());
  const keys = Object.keys(patch) as (keyof MaterialAssignmentState)[];
  if (keys.some((key) => current[key] !== patch[key])) {
    viewer.setFeatureState(MATERIAL_ASSIGNMENT_ID, { ...current, ...patch });
  }
};

const originals = new WeakMap<Mesh, Material | Material[]>();

/** The material a mesh came with, before any library material was put on it. */
export const originalMaterialOf = (mesh: Mesh): Material | Material[] => originals.get(mesh) ?? mesh.material;

/** Remembers the material a mesh came with the first time it is replaced. */
export const rememberOriginalMaterial = (mesh: Mesh): Material | Material[] => {
  const original = originalMaterialOf(mesh);
  originals.set(mesh, original);
  return original;
};
