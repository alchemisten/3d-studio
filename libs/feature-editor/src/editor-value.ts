import { z } from 'zod';
import type { OpeningCamera } from '@schablone/3d-studio-core';
import type { Highlight } from '@schablone/3d-studio-feature-highlights';
import { isRecord, omitKey } from './record';

/** Id of the viewer feature whose config the highlight editor writes. */
export const HIGHLIGHTS_FEATURE_ID = 'highlights';

/** Library material id per part key; a key on a group is inherited by everything beneath it. */
export type MaterialAssignments = Record<string, string>;

/** Everything the editor authors. The host loads it, renders it and persists what `onChange` reports. */
export interface EditorValue {
  /** Config overrides per viewer feature id, passed to the viewer as `featureConfig`. */
  featureConfig: Record<string, unknown>;
  openingCamera?: OpeningCamera;
  materials: MaterialAssignments;
}

export type EditorChange =
  | { type: 'highlights'; highlights: Highlight[] }
  | { type: 'materials'; materials: MaterialAssignments }
  /** `config` holds every override of that feature; an empty object removes the entry. */
  | { type: 'feature-config'; featureId: string; config: Record<string, unknown> }
  | { type: 'opening-camera'; openingCamera: OpeningCamera | undefined }
  /** Undo or redo: the whole value is replaced by an earlier or later one. */
  | { type: 'restore'; value: EditorValue };

const vector = z.tuple([z.number(), z.number(), z.number()]);

const editorValueSchema = z.object({
  featureConfig: z.record(z.string(), z.unknown()).default({}),
  openingCamera: z.object({ position: vector, target: vector }).optional(),
  materials: z.record(z.string(), z.string()).default({}),
});

export const emptyEditorValue: EditorValue = { featureConfig: {}, materials: {} };

/** Validates a stored editor value at the host boundary; missing parts become empty. */
export const parseEditorValue = (input: unknown): EditorValue => {
  const { openingCamera, ...rest } = editorValueSchema.parse(input ?? {});
  return openingCamera ? { ...rest, openingCamera } : rest;
};

const withFeatureConfig = (value: EditorValue, featureId: string, config: Record<string, unknown>): EditorValue => {
  const others = omitKey(value.featureConfig, featureId);
  return { ...value, featureConfig: Object.keys(config).length ? { ...others, [featureId]: config } : others };
};

/** Returns the value after a change; the input is never mutated. */
export const applyEditorChange = (value: EditorValue, change: EditorChange): EditorValue => {
  switch (change.type) {
    case 'highlights': {
      const current = value.featureConfig[HIGHLIGHTS_FEATURE_ID];
      return withFeatureConfig(value, HIGHLIGHTS_FEATURE_ID, {
        ...(isRecord(current) ? current : {}),
        highlights: change.highlights,
      });
    }
    case 'materials':
      return { ...value, materials: change.materials };
    case 'feature-config':
      return withFeatureConfig(value, change.featureId, change.config);
    case 'restore':
      return change.value;
    case 'opening-camera':
      return change.openingCamera ? { ...value, openingCamera: change.openingCamera } : omitKey(value, 'openingCamera');
  }
};

/** The highlights stored in an editor value. */
export const highlightsOf = (value: EditorValue): Highlight[] => {
  const config = value.featureConfig[HIGHLIGHTS_FEATURE_ID];
  return isRecord(config) && Array.isArray(config.highlights) ? (config.highlights as Highlight[]) : [];
};
