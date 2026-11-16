import { z } from 'zod';
import type { Object3D } from 'three';
import type { ViewerState, ViewerStore } from '@schablone/3d-studio-core';

export const HIGHLIGHT_EDITOR_ID = 'highlight-editor';

/** Id of the sidebar tab of the highlight editor. */
export const HIGHLIGHTS_TAB_ID = 'highlights';

export interface HighlightEditorConfig {
  /** Locales the texts are written in; the first one is required and names new highlights. */
  locales: string[];
  /** Ids of the sidebar tabs in which the hotspots show; they can only be selected in the highlights tab. */
  hotspotTabs: string[];
  /** Colours offered as swatches for a hotspot; any other colour is available through the picker. */
  colors: string[];
}

export const highlightEditorConfig = z.object({
  locales: z.array(z.string().min(1)).min(1).default(['en']),
  hotspotTabs: z.array(z.string()).default([HIGHLIGHTS_TAB_ID, 'settings']),
  colors: z.array(z.string()).default(['#111111', '#ffffff', '#2f6fed', '#39766e', '#dda85d', '#d93f3f']),
});

/** View state of the highlight editor that is neither part of the value nor of the nav. */
export interface HighlightEditorState {
  /** Rendered shot of each highlight by id, as a data URL. */
  shots: Record<string, string>;
  /** The highlight whose title field takes focus once its detail opens. */
  focusTitleId?: string;
  /** Title of the highlight that was just deleted, for the undo hint. */
  removedTitle?: string;
}

const INITIAL: HighlightEditorState = { shots: {} };

export const highlightEditorStateOf = (state: ViewerState): HighlightEditorState =>
  (state.featureState[HIGHLIGHT_EDITOR_ID] as HighlightEditorState | undefined) ?? INITIAL;

export const patchHighlightEditorState = (viewer: ViewerStore, patch: Partial<HighlightEditorState>): void =>
  viewer.setFeatureState(HIGHLIGHT_EDITOR_ID, { ...highlightEditorStateOf(viewer.getState()), ...patch });

/** The name of the object or its nearest named ancestor below the scene root. */
export const namedNodeOf = (object: Object3D): string | undefined => {
  for (let node: Object3D | null = object; node?.parent; node = node.parent) {
    if (node.name) return node.name;
  }
  return undefined;
};
