import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Camera, ChevronDown, ChevronUp, MapPin, MousePointerClick, Move, Trash2 } from 'lucide-react';
import { useViewer, useViewerState } from '@schablone/3d-studio-core';
import { highlightLabel } from '@schablone/3d-studio-feature-highlights';
import { Button, IconButton, Toolbar } from '@schablone/3d-studio-ui';
import { type CameraMove, editorCameraOf, type Vec3 } from '../camera-bridge';
import { useEditor } from '../editor-context';
import type { EditorMode } from '../editor-nav';
import { useEditorNav } from '../shell/shell-context';
import { useHandleDrag } from '../use-handle-drag';
import { hitNormal, projectToScreen, raycastModel, viewPlanePoint } from '../viewport';
import { addVectors, hotspotPoint, pointerDirection, pointerLengthOf, scaledTo, surfacePoint } from './highlight-draft';
import { type HighlightEditorConfig, highlightEditorStateOf, namedNodeOf } from './highlight-editor-state';
import { type HighlightEditorApi, useHighlightEditor } from './use-highlight-editor';

const LONG_PRESS_MS = 600;
const LONG_PRESS_SLOP_PX = 8;
const TEXT_TARGETS =
  'input, textarea, select, [contenteditable="true"], [role="slider"], [role="tab"], [role="option"]';

const MODE_HINTS: Partial<Record<EditorMode, string>> = {
  add: 'highlights.placeHint',
  'move-anchor': 'highlights.moveHint',
  'pick-part': 'highlights.part.hint',
  pointer: 'highlights.pointer.hint',
  shot: 'highlights.shot.looking',
};

type Placed = HTMLElement | null;

const TOOLBAR_GAP_PX = 26;
const STAGE_MARGIN_PX = 8;
const PREVIEW_MIN_STAGE_PX = 520;

/**
 * Puts the toolbar beside a point without covering it: below the point, or above it when there is no room,
 * and always inside the stage.
 */
const placeToolbar = (
  element: Placed,
  point: { x: number; y: number; visible: boolean },
  stage: { width: number; height: number },
) => {
  if (!element) return;
  element.hidden = !point.visible;
  const bar = element.firstElementChild as HTMLElement | null;
  const width = bar?.offsetWidth ?? 0;
  const height = bar?.offsetHeight ?? 0;
  const half = width / 2 + STAGE_MARGIN_PX;
  const x = Math.min(Math.max(point.x, half), Math.max(half, stage.width - half));
  const below = point.y + TOOLBAR_GAP_PX;
  const fitsBelow = below + height + STAGE_MARGIN_PX <= stage.height;
  const y = fitsBelow ? below : Math.max(STAGE_MARGIN_PX, point.y - TOOLBAR_GAP_PX - height);
  element.style.transform = `translate(${x}px, ${y}px)`;
};

const place = (element: Placed, point: { x: number; y: number; visible: boolean } | undefined) => {
  if (!element) return;
  element.hidden = !point?.visible;
  if (point) element.style.transform = `translate(${point.x}px, ${point.y}px)`;
};

interface HandleProps {
  editor: HighlightEditorApi;
  register: (element: Placed) => void;
}

/** Where a handle shows while its drag has left the model, in CSS pixels of the canvas. */
interface Ghost {
  at: { x: number; y: number } | null;
}

const SurfaceHandle = ({ editor, register, ghost }: HandleProps & { ghost: Ghost }) => {
  const viewer = useViewer();
  const { t, flush, discard } = useEditor();
  const [invalid, setInvalid] = useState(false);
  const rejected = useRef(false);
  const { selected } = editor;
  const drag = useHandleDrag({
    onMove: (clientX, clientY) => {
      const bridge = editorCameraOf(viewer);
      const model = viewer.getState().gltf?.scene;
      const hit = bridge && model && raycastModel(bridge.three(), model, clientX, clientY);
      const bounds = bridge?.three().gl.domElement.getBoundingClientRect();
      ghost.at = hit || !bounds ? null : { x: clientX - bounds.left, y: clientY - bounds.top };
      rejected.current = !hit;
      setInvalid(!hit);
      if (hit && selected) editor.place(selected.id, hit.point.toArray(), hitNormal(hit), { transient: true });
    },
    onEnd: () => {
      if (rejected.current) discard();
      else flush();
      ghost.at = null;
      rejected.current = false;
      setInvalid(false);
    },
  });
  return (
    <button
      ref={register}
      type="button"
      className="ds-editor-handle ds-editor-handle--surface"
      aria-label={t('highlights.handle.surface')}
      title={t('highlights.handle.surface')}
      data-invalid={invalid ? '' : undefined}
      data-testid="ds-highlight-handle-surface"
      {...drag}
    />
  );
};

const PointerHandle = ({ editor, register }: HandleProps) => {
  const viewer = useViewer();
  const { t, flush } = useEditor();
  const { selected, resolve, modelSize } = editor;
  const drag = useHandleDrag({
    onMove: (clientX, clientY, free) => {
      const bridge = editorCameraOf(viewer);
      if (!bridge || !selected) return;
      const state = bridge.three();
      if (free) {
        const position = viewPlanePoint(state, clientX, clientY, hotspotPoint(selected, resolve));
        if (position) editor.setPointerEnd(selected.id, position, { transient: true });
        return;
      }
      const bounds = state.gl.domElement.getBoundingClientRect();
      const base = surfacePoint(selected, resolve);
      const unit = modelSize / 10;
      const from = projectToScreen(state, base);
      const to = projectToScreen(state, addVectors(base, scaledTo(pointerDirection(selected, resolve), unit)));
      const axis = { x: to.x - from.x, y: to.y - from.y };
      const span = axis.x * axis.x + axis.y * axis.y;
      if (span === 0) return;
      const along = ((clientX - bounds.left - from.x) * axis.x + (clientY - bounds.top - from.y) * axis.y) / span;
      editor.setLength(selected.id, Math.max(editor.maxLength / 100, along * unit), { transient: true });
    },
    onEnd: flush,
  });
  return (
    <button
      ref={register}
      type="button"
      className="ds-editor-handle ds-editor-handle--pointer"
      aria-label={t('highlights.handle.pointer')}
      title={t('highlights.handle.pointer')}
      data-testid="ds-highlight-handle-pointer"
      {...drag}
    />
  );
};

const TargetHandle = ({ editor, register }: HandleProps) => {
  const viewer = useViewer();
  const { t, flush } = useEditor();
  const { selected, resolve } = editor;
  const drag = useHandleDrag({
    onMove: (clientX, clientY) => {
      const bridge = editorCameraOf(viewer);
      const shot = selected?.camera;
      if (!bridge || !selected || !shot) return;
      const target = viewPlanePoint(bridge.three(), clientX, clientY, shot.target ?? surfacePoint(selected, resolve));
      if (target) editor.setShot(selected.id, { position: shot.position, target, fov: shot.fov }, { transient: true });
    },
    onEnd: flush,
  });
  return (
    <button
      ref={register}
      type="button"
      className="ds-editor-handle ds-editor-handle--target"
      aria-label={t('highlights.handle.target')}
      title={t('highlights.handle.target')}
      data-testid="ds-highlight-handle-target"
      {...drag}
    />
  );
};

interface ToolButton {
  mode: EditorMode;
  label: string;
  icon: ReactNode;
}

const TOOLS: ToolButton[] = [
  { mode: 'move-anchor', label: 'highlights.move', icon: <Move size={16} aria-hidden="true" /> },
  { mode: 'pointer', label: 'highlights.pointer', icon: <MapPin size={16} aria-hidden="true" /> },
  { mode: 'pick-part', label: 'highlights.part.pick', icon: <MousePointerClick size={16} aria-hidden="true" /> },
  { mode: 'shot', label: 'highlights.shot.look', icon: <Camera size={16} aria-hidden="true" /> },
];

/**
 * The DOM side of the highlight editor over the viewport: draggable handles and a small toolbar at the
 * selected highlight, the shot preview, the mode banner and the keyboard shortcuts.
 */
export const HighlightOverlay = ({ config }: { config: HighlightEditorConfig }) => {
  const viewer = useViewer();
  const editor = useHighlightEditor(config);
  const { t } = useEditor();
  const { nav } = useEditorNav();
  const [previewOpen, setPreviewOpen] = useState<boolean>();
  const shots = useViewerState((state) => highlightEditorStateOf(state).shots);
  const elements = useRef<{ toolbar: Placed; surface: Placed; pointer: Placed; target: Placed }>({
    toolbar: null,
    surface: null,
    pointer: null,
    target: null,
  });
  const ghost = useRef<Ghost>({ at: null }).current;
  const latest = useRef(editor);
  latest.current = editor;
  const { selected, mode, active, resolve } = editor;
  const selectedId = selected?.id;
  const looking = active && mode === 'shot' && selectedId !== undefined;
  const lifted = selected ? pointerLengthOf(selected, resolve) > 0 : false;

  useEffect(() => {
    const focus = viewer.on$('highlight:focus').subscribe(({ id }) => {
      if (!id) return;
      queueMicrotask(() => viewer.emit('highlight:focus', { id: null }));
      if (latest.current.active && latest.current.mode === 'select') latest.current.select(id);
    });
    return () => focus.unsubscribe();
  }, [viewer]);

  const showsHotspots = config.hotspotTabs.includes(nav.tool ?? '');
  useEffect(() => viewer.setFeatureEnabled('highlights', showsHotspots), [viewer, showsHotspots]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const bridge = editorCameraOf(viewer);
      const current = latest.current.selected;
      const { toolbar, surface, pointer, target } = elements.current;
      if (!bridge || !current) return;
      const state = bridge.three();
      const at = (point: Vec3) => projectToScreen(state, point);
      const hotspot = hotspotPoint(current, latest.current.resolve);
      const base = surfacePoint(current, latest.current.resolve);
      placeToolbar(toolbar, at(hotspot), state.size);
      place(surface, ghost.at ? { ...ghost.at, visible: true } : at(base));
      place(pointer, at(hotspot));
      place(target, current.camera && at(current.camera.target ?? base));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [viewer, ghost]);

  useEffect(() => {
    if (!looking) return undefined;
    const bridge = editorCameraOf(viewer);
    const before = bridge?.capture();
    const { selected: current, resolve: toPoint } = latest.current;
    const shot = current?.camera;
    if (shot && current) {
      bridge?.flyTo({ position: shot.position, target: shot.target ?? surfacePoint(current, toPoint), fov: shot.fov });
    }
    return () => {
      const back: CameraMove | undefined = before && {
        position: before.position,
        target: before.target,
        fov: before.fov,
      };
      if (back) editorCameraOf(viewer)?.flyTo(back);
    };
  }, [looking, selectedId, viewer]);

  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as Element | null;
      const inEditor = target === document.body || Boolean(target?.closest?.('.ds-editor'));
      if (!inEditor || target?.closest?.(TEXT_TARGETS) || event.ctrlKey || event.metaKey || event.altKey) return;
      const { selected: current, mode: currentMode, setMode, select, step, remove, flyToShot } = latest.current;
      const key = event.key.toLowerCase();
      if (key === 'escape') {
        if (currentMode !== 'select' && latest.current.items.length > 0) setMode(undefined);
        else if (current) select(undefined);
        else return;
      } else if (key === 'delete' && current) remove(current.id);
      else if (key === '[' || key === 'k') step(-1);
      else if (key === ']' || key === 'j') step(1);
      else if (key === 'f' && current) flyToShot(current.id);
      else return;
      event.preventDefault();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active]);

  useEffect(() => {
    const canvas = editorCameraOf(viewer)?.three().gl.domElement;
    if (!active || !selectedId || !canvas) return undefined;
    let timer = 0;
    const origin = { x: 0, y: 0 };
    const cancel = () => window.clearTimeout(timer);
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return;
      origin.x = event.clientX;
      origin.y = event.clientY;
      timer = window.setTimeout(() => {
        const bridge = editorCameraOf(viewer);
        const model = viewer.getState().gltf?.scene;
        const hit = bridge && model && raycastModel(bridge.three(), model, origin.x, origin.y);
        const node = hit && namedNodeOf(hit.object);
        if (node) latest.current.attachPart(selectedId, node);
      }, LONG_PRESS_MS);
    };
    const onMove = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > LONG_PRESS_SLOP_PX) cancel();
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', cancel);
    canvas.addEventListener('pointercancel', cancel);
    return () => {
      cancel();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', cancel);
      canvas.removeEventListener('pointercancel', cancel);
    };
  }, [active, selectedId, viewer]);

  if (!active) return null;
  const hint = MODE_HINTS[mode];
  const stageWidth = editorCameraOf(viewer)?.three().size.width ?? 0;
  const showsPreview = previewOpen ?? stageWidth >= PREVIEW_MIN_STAGE_PX;
  const title = selected ? highlightLabel(selected, editor.locales[0]) : '';
  const toggle = (next: EditorMode) => {
    if (!selected) return;
    if (next === 'pointer' && !lifted) editor.setLength(selected.id, editor.defaultLength);
    editor.setMode(mode === next ? undefined : next);
  };

  return (
    <div className="ds-editor-overlay" data-testid="ds-highlight-overlay">
      {hint && (
        <div className="ds-editor-banner" role="status" data-testid="ds-editor-banner">
          <span>{t(hint, { name: title })}</span>
          {looking && selected && (
            <Button
              data-testid="ds-highlight-shot-done"
              onClick={() => {
                editor.captureShot(selected.id);
                editor.setMode(undefined);
              }}
            >
              {t('highlights.shot.done')}
            </Button>
          )}
          {editor.items.length > 0 && (
            <Button variant="ghost" onClick={() => editor.setMode(undefined)}>
              {t('shell.cancel')}
            </Button>
          )}
        </div>
      )}
      {selected && !looking && (
        <>
          <div ref={(element) => void (elements.current.toolbar = element)} className="ds-editor-anchor" hidden>
            <Toolbar label={t('highlights.toolbar', { name: title })} className="ds-editor-hotbar">
              {TOOLS.map((tool) => (
                <IconButton
                  key={tool.mode}
                  label={t(tool.label)}
                  icon={tool.icon}
                  active={mode === tool.mode}
                  data-testid={`ds-highlight-tool-${tool.mode}`}
                  onClick={() => toggle(tool.mode)}
                />
              ))}
              <IconButton
                label={t('highlights.remove')}
                icon={<Trash2 size={16} aria-hidden="true" />}
                data-testid="ds-highlight-tool-delete"
                onClick={() => editor.remove(selected.id)}
              />
            </Toolbar>
          </div>
          <SurfaceHandle
            editor={editor}
            ghost={ghost}
            register={(element) => void (elements.current.surface = element)}
          />
          {lifted && (
            <PointerHandle editor={editor} register={(element) => void (elements.current.pointer = element)} />
          )}
          {selected.camera && (
            <TargetHandle editor={editor} register={(element) => void (elements.current.target = element)} />
          )}
          {selected.camera && shots[selected.id] && (
            <figure
              className="ds-editor-pip"
              data-testid="ds-highlight-pip"
              data-collapsed={showsPreview ? undefined : ''}
            >
              {showsPreview && <img src={shots[selected.id]} alt={t('highlights.shot.preview', { name: title })} />}
              <figcaption>
                <button
                  type="button"
                  className="ds-editor-pip__toggle"
                  aria-expanded={showsPreview}
                  data-testid="ds-highlight-pip-toggle"
                  onClick={() => setPreviewOpen(!showsPreview)}
                >
                  {t('highlights.shot')}
                  {showsPreview ? (
                    <ChevronDown size={14} aria-hidden="true" />
                  ) : (
                    <ChevronUp size={14} aria-hidden="true" />
                  )}
                </button>
              </figcaption>
            </figure>
          )}
        </>
      )}
    </div>
  );
};
