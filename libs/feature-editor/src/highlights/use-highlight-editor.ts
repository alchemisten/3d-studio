import { useCallback, useMemo } from 'react';
import { type Object3D, Vector3 } from 'three';
import { useViewer, useViewerState } from '@schablone/3d-studio-core';
import { type Anchor, type Highlight, highlightLabel, resolveAnchor } from '@schablone/3d-studio-feature-highlights';
import { type CameraMove, editorCameraOf, type Vec3 } from '../camera-bridge';
import { type EmitOptions, useEditor } from '../editor-context';
import type { EditorMode } from '../editor-nav';
import { highlightsOf } from '../editor-value';
import { useEditorNav } from '../shell/shell-context';
import { hitNormal, modelSizeOf, surfaceAt } from '../viewport';
import {
  createHighlight,
  defaultPointerLength,
  maxPointerLength,
  moveHighlight,
  neighbourId,
  nextHighlightId,
  placeHighlight,
  pointerLengthOf,
  removeHighlight,
  reorderHighlight,
  type ResolveAnchor,
  setHighlightCamera,
  setHighlightColor,
  setHighlightText,
  setPart,
  setPointerEnd,
  setPointerLength,
  surfacePoint,
  updateHighlight,
} from './highlight-draft';
import {
  type HighlightEditorConfig,
  HIGHLIGHTS_TAB_ID,
  namedNodeOf,
  patchHighlightEditorState,
} from './highlight-editor-state';

export interface HighlightEditorApi {
  items: readonly Highlight[];
  /** The highlight whose detail is open. */
  selected: Highlight | undefined;
  /** What the next interaction in the viewport does; `add` while there is nothing to select yet. */
  mode: EditorMode;
  /** Whether the highlights tab is the open one. */
  active: boolean;
  locales: readonly string[];
  /** The model's size, the scale for pointer lengths. */
  modelSize: number;
  defaultLength: number;
  maxLength: number;
  resolve: ResolveAnchor;
  select: (id: string | undefined) => void;
  /** Selects the highlight `delta` places from the selected one. */
  step: (delta: number) => void;
  setMode: (mode: EditorMode | undefined) => void;
  /** Creates a highlight on the surface, with the current view as its shot, and opens it. */
  addAt: (point: Vec3, normal: Vec3) => void;
  place: (id: string, point: Vec3, normal: Vec3 | undefined, options?: EmitOptions) => void;
  setLength: (id: string, length: number, options?: EmitOptions) => void;
  setPointerEnd: (id: string, position: Vec3, options?: EmitOptions) => void;
  /** Aligns the pointer with the surface normal under the highlight again. */
  resetPointer: (id: string) => void;
  /** Sets the text of one locale; in progress (transient) unless the options say otherwise. */
  setText: (id: string, field: 'label' | 'description', locale: string, value: string, options?: EmitOptions) => void;
  setColor: (id: string, color: string) => void;
  /** Attaches a node, the part under the highlight with `'auto'`, or detaches with `undefined`. */
  attachPart: (id: string, node: string | 'auto' | undefined) => void;
  setShot: (id: string, shot: CameraMove | undefined, options?: EmitOptions) => void;
  /** Makes the current view the highlight's shot. */
  captureShot: (id: string) => void;
  flyToShot: (id: string) => void;
  remove: (id: string) => void;
  move: (id: string, delta: number) => void;
  reorder: (id: string, index: number) => void;
}

const NO_HIGHLIGHTS: readonly Highlight[] = [];
const TRANSIENT: EmitOptions = { transient: true };

const normalAt = (model: Object3D | undefined, point: Vec3): Vec3 | undefined => {
  const hit = model && surfaceAt(model, point);
  return hit && hitNormal(hit);
};

/** The highlights of the edited scene with everything the highlight tab and the viewport do to them. */
export const useHighlightEditor = (config: HighlightEditorConfig): HighlightEditorApi => {
  const viewer = useViewer();
  const { value, emit, t } = useEditor();
  const { nav, navigate } = useEditorNav();
  const gltf = useViewerState((state) => state.gltf);
  const model = gltf?.scene;
  const stored = highlightsOf(value);
  const items = stored.length ? stored : NO_HIGHLIGHTS;
  const selected = items.find((item) => item.id === nav.highlight);
  const active = nav.tool === HIGHLIGHTS_TAB_ID;
  const { locales } = config;
  const modelSize = useMemo(() => modelSizeOf(model), [model]);
  const resolve = useCallback<ResolveAnchor>(
    (anchor: Anchor) => resolveAnchor(anchor, model, new Vector3()).toArray(),
    [model],
  );

  const change = (highlights: Highlight[], options?: EmitOptions) => emit({ type: 'highlights', highlights }, options);
  const update = (id: string, next: (highlight: Highlight) => Highlight, options?: EmitOptions) =>
    change(updateHighlight(items, id, next), options);
  const withNormal = (highlight: Highlight): Highlight => {
    if (highlight.normal || pointerLengthOf(highlight, resolve) > 0) return highlight;
    const normal = normalAt(model, surfacePoint(highlight, resolve));
    return normal ? { ...highlight, normal } : highlight;
  };
  const shotOf = (pose: CameraMove | undefined) => pose && { position: pose.position, target: pose.target };

  return {
    items,
    selected,
    mode: nav.mode ?? (active && items.length === 0 ? 'add' : 'select'),
    active,
    locales,
    modelSize,
    defaultLength: defaultPointerLength(modelSize),
    maxLength: maxPointerLength(modelSize),
    resolve,
    select: (id) => navigate({ tool: HIGHLIGHTS_TAB_ID, highlight: id, mode: undefined }),
    step: (delta) => navigate({ highlight: neighbourId(items, selected?.id, delta), mode: undefined }),
    setMode: (mode) => navigate({ mode }),
    addAt: (point, normal) => {
      const id = nextHighlightId(items.map((item) => item.id));
      const title = t('highlights.newTitle', { number: items.length + 1 });
      const camera = shotOf(editorCameraOf(viewer)?.capture());
      change([...items, createHighlight({ id, title, locale: locales[0], point, normal, camera })]);
      patchHighlightEditorState(viewer, { focusTitleId: id });
      navigate({ tool: HIGHLIGHTS_TAB_ID, highlight: id, mode: undefined });
    },
    place: (id, point, normal, options) =>
      update(id, (highlight) => placeHighlight(highlight, point, normal, resolve), options),
    setLength: (id, length, options) =>
      update(id, (highlight) => setPointerLength(withNormal(highlight), length, resolve), options),
    setPointerEnd: (id, position, options) =>
      update(id, (highlight) => setPointerEnd(highlight, position, resolve), options),
    resetPointer: (id) =>
      update(id, (highlight) => {
        const normal = normalAt(model, surfacePoint(highlight, resolve));
        const length = pointerLengthOf(highlight, resolve) || defaultPointerLength(modelSize);
        return setPointerLength(normal ? { ...highlight, normal } : highlight, length, resolve);
      }),
    setText: (id, field, locale, text, options = TRANSIENT) =>
      update(id, (highlight) => setHighlightText(highlight, field, locale, text, locales), options),
    setColor: (id, color) => update(id, (highlight) => setHighlightColor(highlight, color), TRANSIENT),
    attachPart: (id, node) =>
      update(id, (highlight) => {
        const hit = node === 'auto' && model ? surfaceAt(model, surfacePoint(highlight, resolve)) : undefined;
        return setPart(highlight, node === 'auto' ? hit && namedNodeOf(hit.object) : node);
      }),
    setShot: (id, shot, options) => update(id, (highlight) => setHighlightCamera(highlight, shotOf(shot)), options),
    captureShot: (id) => {
      const shot = shotOf(editorCameraOf(viewer)?.capture());
      if (shot) update(id, (highlight) => setHighlightCamera(highlight, shot));
    },
    flyToShot: (id) => {
      const camera = items.find((item) => item.id === id)?.camera;
      if (camera) {
        editorCameraOf(viewer)?.flyTo({
          position: camera.position,
          target: camera.target ?? surfacePoint(items.find((item) => item.id === id) as Highlight, resolve),
          fov: camera.fov,
        });
      }
    },
    remove: (id) => {
      const removed = items.find((item) => item.id === id);
      change(removeHighlight(items, id));
      patchHighlightEditorState(viewer, { removedTitle: removed && highlightLabel(removed, locales[0]) });
      navigate({ highlight: undefined, mode: undefined });
    },
    move: (id, delta) => change(moveHighlight(items, id, delta)),
    reorder: (id, index) => change(reorderHighlight(items, id, index)),
  };
};
