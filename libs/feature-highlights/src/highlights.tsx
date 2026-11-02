import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, GreaterDepth, Mesh, PerspectiveCamera, Raycaster, Vector3 } from 'three';
import type { Material, Object3D } from 'three';
import {
  defineFeature,
  useModelTools,
  ModelToolControls,
  useFeature,
  useFeatureEnabled,
  useViewer,
  useViewerState,
  type ViewerStore,
} from '@schablone/3d-studio-core';
import { IconButton, Panel, Slot, useSlotFills } from '@schablone/3d-studio-ui';
import './highlights.css';
import { HoverOutline } from './hover-outline';
import { pointerTipRadius, updatePointer } from './pointer';
import { highlightLabel, isHighlightVisible, pickHotspot, resolveAnchor, runCommand, type AnimationSnapshot, type Highlight } from './highlight-model';

declare module '@schablone/3d-studio-ui' {
  interface SlotMap {
    /** Content of one hotspot. Replace to render your own marker. */
    'highlights.hotspot': { highlight: Highlight; focused: boolean };
    /** Body of the detail panel shown while a highlight is focused. */
    'highlights.detail': { highlight: Highlight };
  }
}

declare module '@schablone/3d-studio-core' {
  interface ViewerEventMap {
    'animation:seek': { time: number; clip?: string };
    'animation:play': { clip?: string };
    'animation:pause': { clip?: string };
    'animation:stop': { clip?: string };
    'animation:cue': { id: string; time: number; clip?: string };
    /** Command and notification: focus a highlight, or release with `null`. */
    'highlight:focus': { id: string | null };
  }
}

export interface HighlightsConfig {
  /** Initial state of the toggle; hotspots are hidden when off. */
  enabled: boolean;
  highlights: Highlight[];
  /** Locale used to pick a label from a label map. */
  locale: string;
  /** Show the default detail panel (bottom-left) while a highlight is focused. */
  detail: boolean;
  /** Show the prev/next selector with a popover list (bottom-center). */
  select: boolean | 'playback';
  /** Pause playing animations while the pointer is over a hotspot so moving hotspots are easy to hit. */
  pauseOnHover: boolean;
}

interface HighlightsState {
  focusedId: string | null;
}

const FEATURE_ID = 'highlights';
const HIT_RADIUS = 28;
const PAUSE_RADIUS = 110;
const DRAG_LEAVE_PX = 8;
const HIT_RADIUS_TOUCH = 40;
// Stop the occlusion ray slightly short so anchors lying on a surface do not occlude themselves.
const OCCLUSION_MARGIN = 0.02;
const OCCLUSION_MARGIN_MAX = 0.05;

const isShown = (object: Object3D | null): boolean => {
  for (let node = object; node; node = node.parent) {
    if (!node.visible) {
      return false;
    }
  }
  return true;
};
const DEFAULT_SPEED = { in: 3, out: 6, fov: 6 };

const openLists = new WeakMap<ViewerStore, HTMLDivElement>();
const previewIds = new WeakMap<ViewerStore, string>();
const hotspotRegistry = new WeakMap<ViewerStore, Map<string, HTMLElement>>();
const hotspotsOf = (viewer: ViewerStore) => {
  let map = hotspotRegistry.get(viewer);
  if (!map) {
    map = new Map();
    hotspotRegistry.set(viewer, map);
  }
  return map;
};

const focusedIdOf = (viewer: ViewerStore) =>
  (viewer.getState().featureState[FEATURE_ID] as HighlightsState | undefined)?.focusedId ?? null;

export interface HighlightsApi {
  focusedId: string | null;
  focus: (id: string) => void;
  release: () => void;
}

/** Focus state and commands, usable in the DOM tree and in the scene. */
export const useHighlights = (): HighlightsApi => {
  const viewer = useViewer();
  const focusedId = useViewerState((s) => (s.featureState[FEATURE_ID] as HighlightsState | undefined)?.focusedId ?? null);
  return {
    focusedId,
    focus: (id) => viewer.emit('highlight:focus', { id }),
    release: () => viewer.emit('highlight:focus', { id: null }),
  };
};

interface OrbitLike {
  target: Vector3;
  update: () => void;
  addEventListener: (type: 'start', listener: () => void) => void;
  removeEventListener: (type: 'start', listener: () => void) => void;
}

interface Pose {
  position: Vector3;
  target: Vector3;
  fov: number;
}

interface Goal extends Pose {
  speed: { position: number; fov: number };
  /** Set when the highlight has no static camera target; the target follows the highlight target. */
  followTarget: boolean;
  /** Leaving by dragging: ease target/distance/fov back but keep the user's viewing direction. */
  keepDirection?: boolean;
}

const animationSnapshot = (viewer: ViewerStore): AnimationSnapshot | undefined => {
  const state = viewer.getState().featureState['animation'] as
    | { time: number; status: Record<string, string>; clips: string[] }
    | undefined;
  if (!state || state.clips.length === 0) {
    return undefined;
  }
  return { time: state.time, status: state.status };
};

const PointerLine = ({ highlight }: { highlight: Highlight }) => {
  const { viewer } = useFeature<HighlightsConfig>();
  const gltf = useViewerState((s) => s.gltf);
  const color = (typeof highlight.pointer === 'object' && highlight.pointer.color) || highlight.color || '#ffffff';
  const line = useRef<Mesh>(null);
  const dot = useRef<Mesh>(null);
  const a = useRef(new Vector3());
  const b = useRef(new Vector3());
  const { camera, size } = useThree();

  useFrame(() => {
    resolveAnchor(highlight.anchor, gltf?.scene, a.current);
    resolveAnchor(highlight.target ?? highlight.anchor, gltf?.scene, b.current);
    if (line.current && dot.current) {
      const active = hotspotsOf(viewer).get(highlight.id)?.hasAttribute('data-hover');
      const perspective = camera as PerspectiveCamera;
      const unitsPerPixel = 2 * camera.position.distanceTo(a.current) * Math.tan(perspective.fov * Math.PI / 360) / size.height;
      updatePointer(line.current, dot.current, a.current, b.current, isHighlightVisible(highlight, animationSnapshot(viewer)), unitsPerPixel * (active ? 1.8 : 0.8));
      const viewDepth = perspective.isPerspectiveCamera ? Math.abs(b.current.applyMatrix4(camera.matrixWorldInverse).z) : 1;
      dot.current.scale.setScalar(pointerTipRadius(viewDepth, size.height, camera.projectionMatrix.elements[5]));
    }
  });

  return (
    <>
      <mesh ref={line} renderOrder={2}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshBasicMaterial color={color} depthWrite={false} />
        <mesh renderOrder={3}>
          <cylinderGeometry args={[1, 1, 1, 8]} />
          <meshBasicMaterial color={color} depthFunc={GreaterDepth} depthWrite={false} transparent opacity={0.4} />
        </mesh>
      </mesh>
      <mesh ref={dot}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  );
};

const HighlightsScene = () => {
  const { config, viewer } = useFeature<HighlightsConfig>();
  const enabled = useFeatureEnabled();
  const gltf = useViewerState((s) => s.gltf);
  const { focusedId, release } = useHighlights();
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;
  const size = useThree((s) => s.size);
  const goal = useRef<Goal | null>(null);
  const saved = useRef<Pose | null>(null);
  const leftByDrag = useRef(false);
  const pausedClips = useRef<string[]>([]);
  const nearId = useRef<string | null>(null);
  const tmp = useRef({ world: new Vector3(), target: new Vector3() });
  const occlusion = useRef({ raycaster: new Raycaster(), direction: new Vector3(), cursor: 0, hidden: new Set<string>() });
  const gl = useThree((s) => s.gl);
  // Hotspots slide while animations run, so native :hover would flicker; hit-test against projected positions instead.
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const points = useRef<Array<{ id: string; x: number; y: number }>>([]);
  const [outline, setOutline] = useState<Highlight | undefined>();
  const lastOutline = useRef<Highlight | undefined>(undefined);
  const hovered = useRef<string | null>(null);
  const latest = useRef({ focusedId, config });
  latest.current = { focusedId, config };

  useEffect(() => {
    const canvas = gl.domElement;
    const local = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      const onViewer = event.target === canvas || (event.target as Element | null)?.closest?.('.ds-hotspot');
      return inside && onViewer ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : null;
    };
    const move = (event: PointerEvent) => {
      pointer.current = local(event);
    };
    const down = (event: PointerEvent) => {
      const at = local(event);
      pointer.current = at;
      const radius = event.pointerType === 'touch' ? HIT_RADIUS_TOUCH : HIT_RADIUS;
      const id = pickHotspot(points.current, at, radius, hovered.current);
      if (id) {
        viewer.emit('highlight:focus', { id: latest.current.focusedId === id ? null : id });
      }
    };
    const leave = () => {
      pointer.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', down);
    document.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerleave', leave);
    };
  }, [gl, viewer]);
  const focused = config.highlights.find((h) => h.id === focusedId);

  useEffect(() => {
    if (!enabled && focusedId) {
      release();
    }
  }, [enabled, focusedId, release]);

  useEffect(() => {
    // Dragging past a small threshold leaves the focused highlight, like the old studio.
    let origin: { x: number; y: number } | null = null;
    const cancel = () => {
      goal.current = null;
    };
    const down = (event: PointerEvent) => {
      origin = { x: event.clientX, y: event.clientY };
    };
    const move = (event: PointerEvent) => {
      if (origin && latest.current.focusedId && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > DRAG_LEAVE_PX) {
        origin = null;
        leftByDrag.current = true;
        release();
      }
    };
    const up = () => {
      origin = null;
    };
    const canvas = gl.domElement;
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    controls?.addEventListener('start', cancel);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      controls?.removeEventListener('start', cancel);
    };
  }, [controls, gl, release]);

  useEffect(() => {
    const currentTarget = () => controls?.target.clone() ?? new Vector3();
    if (focused) {
      if (focused.camera) {
        saved.current ??= { position: camera.position.clone(), target: currentTarget(), fov: camera.fov };
        const speed = { ...DEFAULT_SPEED, ...focused.speed };
        goal.current = {
          position: new Vector3(...focused.camera.position),
          target: focused.camera.target ? new Vector3(...focused.camera.target) : currentTarget(),
          fov: focused.camera.fov ?? camera.fov,
          speed: { position: speed.in, fov: speed.fov },
          followTarget: !focused.camera.target,
        };
      } else {
        goal.current = null;
      }
      const anim = focused.animation;
      if (anim) {
        const timer = setTimeout(() => {
          if (anim.targetTime !== undefined) {
            viewer.emit('animation:seek', { time: anim.targetTime, clip: anim.clip });
          }
          if (anim.state) {
            viewer.emit(anim.state === 'playing' ? 'animation:play' : 'animation:pause', { clip: anim.clip });
          }
        }, anim.delay ?? 0);
        return () => clearTimeout(timer);
      }
    } else if (saved.current) {
      goal.current = {
        ...saved.current,
        speed: { position: DEFAULT_SPEED.out, fov: DEFAULT_SPEED.fov },
        followTarget: false,
        keepDirection: leftByDrag.current,
      };
      leftByDrag.current = false;
      saved.current = null;
    }
    return undefined;
  }, [focused, camera, controls, viewer]);

  useEffect(() => {
    if (!focused?.nodes?.length || !gltf) {
      return undefined;
    }
    const touched = new Map<Material & { emissive: Color }, Color>();
    focused.nodes.forEach((name) => {
      gltf.scene.getObjectByName(name)?.traverse((object: Object3D) => {
        const materials = (object as Mesh).material;
        for (const material of Array.isArray(materials) ? materials : [materials]) {
          if (material && 'emissive' in material && material.emissive instanceof Color) {
            const target = material as Material & { emissive: Color };
            if (!touched.has(target)) touched.set(target, target.emissive.clone());
            target.emissive.set(focused.color ?? '#ffffff').multiplyScalar(0.4);
          }
        }
      });
    });
    return () => touched.forEach((original, material) => material.emissive.copy(original));
  }, [focused, gltf]);

  useFrame((_, delta) => {
    const root = gltf?.scene;
    const animation = animationSnapshot(viewer);
    const { world, target } = tmp.current;

    const current = goal.current;
    const followsNode = focused?.camera && !focused.camera.target && 'node' in (focused.target ?? focused.anchor);
    if (focused && (current?.followTarget || followsNode)) {
      resolveAnchor(focused.target ?? focused.anchor, root, target);
    }
    if (current) {
      if (current.followTarget) {
        current.target.copy(target);
      }
      const k = 1 - Math.exp(-current.speed.position * delta);
      if (current.keepDirection && controls) {
        const distance = current.position.distanceTo(current.target);
        const offset = camera.position.clone().sub(controls.target);
        const nextDistance = offset.length() + (distance - offset.length()) * k;
        controls.target.lerp(current.target, k);
        camera.position.copy(controls.target).add(offset.setLength(nextDistance));
      } else {
        camera.position.lerp(current.position, k);
      }
      if (!current.keepDirection) {
        controls?.target.lerp(current.target, k);
      }
      if (!controls) {
        camera.lookAt(current.target);
      }
      camera.fov += (current.fov - camera.fov) * (1 - Math.exp(-current.speed.fov * delta));
      camera.updateProjectionMatrix();
      controls?.update();
      const settled = current.keepDirection
        ? Math.abs(camera.position.distanceTo(controls?.target ?? current.target) - current.position.distanceTo(current.target)) < 0.001
        : camera.position.distanceTo(current.position) < 0.001;
      if (settled && (!controls || controls.target.distanceTo(current.target) < 0.001) && Math.abs(camera.fov - current.fov) < 0.01) {
        goal.current = null;
      }
    } else if (controls && followsNode) {
      controls.target.copy(target);
    }
    camera.updateWorldMatrix(true, false);

    const occ = occlusion.current;
    // One raycast per frame, round-robin over the hotspots, keeps the cost flat on heavy models.
    const registered = hotspotsOf(viewer);
    const turn = registered.size ? occ.cursor++ % registered.size : 0;
    let index = -1;
    const visiblePoints: Array<{ id: string; x: number; y: number }> = [];
    hotspotsOf(viewer).forEach((element, id) => {
      const highlight = config.highlights.find((h) => h.id === id);
      if (!highlight) {
        return;
      }
      resolveAnchor(highlight.anchor, root, world);
      index += 1;
      if (index === turn && root && enabled) {
        const distance = world.distanceTo(camera.position);
        occ.direction.copy(world).sub(camera.position).normalize();
        occ.raycaster.set(camera.position, occ.direction);
        occ.raycaster.far = distance - Math.min(distance * OCCLUSION_MARGIN, OCCLUSION_MARGIN_MAX);
        const blocked = occ.raycaster.intersectObject(root, true).some((hit) => isShown(hit.object));
        if (blocked) {
          occ.hidden.add(id);
        } else {
          occ.hidden.delete(id);
        }
      }
      world.project(camera);
      const hidden = !enabled || world.z > 1 || !isHighlightVisible(highlight, animation);
      element.toggleAttribute('data-hidden', hidden);
      element.setAttribute('data-positioned', '');
      element.toggleAttribute('data-occluded', occ.hidden.has(id));
      const x = (world.x * 0.5 + 0.5) * size.width;
      const y = (-world.y * 0.5 + 0.5) * size.height;
      element.style.setProperty('--ds-hotspot-x', `${x}px`);
      element.style.setProperty('--ds-hotspot-y', `${y}px`);
      if (!hidden) {
        visiblePoints.push({ id, x, y });
      }
    });
    points.current = visiblePoints;
    hovered.current = pickHotspot(visiblePoints, pointer.current, HIT_RADIUS, hovered.current);
    // Pause on approach: pausing goes through React state, so the hotspot would drift away from a precise hover.
    const near = config.pauseOnHover ? pickHotspot(visiblePoints, pointer.current, PAUSE_RADIUS, nearId.current, 24) : null;
    const wasNear = nearId.current;
    nearId.current = near;
    if (!!wasNear !== !!near) {
      // Moving hotspots are hard to hit: freeze playing animations while hovering, resume afterwards.
      if (near) {
        const playing = Object.entries(animation?.status ?? {}).filter(([, status]) => status === 'playing').map(([clip]) => clip);
        pausedClips.current = playing;
        playing.forEach((clip) => viewer.emit('animation:pause', { clip }));
      } else {
        const clips = pausedClips.current;
        pausedClips.current = [];
        if (!latest.current.focusedId) {
          clips.forEach((clip) => viewer.emit('animation:play', { clip }));
        }
      }
    }
    const preview = previewIds.get(viewer) ?? hovered.current;
    const nextOutline = enabled && preview && visiblePoints.some(point => point.id === preview)
      ? config.highlights.find(highlight => highlight.id === preview && highlight.hoverOutline) : undefined;
    if (lastOutline.current !== nextOutline) {
      lastOutline.current = nextOutline;
      setOutline(nextOutline);
    }
    hotspotsOf(viewer).forEach((element, id) => element.toggleAttribute('data-hover', id === preview));
    const entries = openLists.get(viewer)?.children;
    if (entries) {
      for (const entry of Array.from(entries)) {
        entry.toggleAttribute('data-hover', entry.getAttribute('data-highlight-id') === preview);
      }
    }
    gl.domElement.style.cursor = hovered.current ? 'pointer' : '';

  });

  return enabled ? <>{outline && gltf && <HoverOutline highlight={outline} model={gltf.scene} />}{config.highlights.filter((highlight) => highlight.pointer).map((highlight) => <PointerLine key={highlight.id} highlight={highlight} />)}</> : null;
};

const HotspotLayer = ({ config }: { config: HighlightsConfig }) => {
  const viewer = useViewer();
  const { focusedId, focus, release } = useHighlights();
  return (
    <>
      {config.highlights.map((highlight, index) => {
        const focused = highlight.id === focusedId;
        return (
          <button
            key={highlight.id}
            type="button"
            ref={(element) => {
              const registry = hotspotsOf(viewer);
              if (element) {
                registry.set(highlight.id, element);
              } else {
                registry.delete(highlight.id);
              }
            }}
            className={`ds-hotspot ds-hotspot--${highlight.kind ?? 'simple'}`}
            data-kind={highlight.kind ?? 'simple'}
            data-focused={focused ? '' : undefined}
            data-testid={`ds-hotspot-${highlight.id}`}
            aria-label={highlightLabel(highlight, config.locale)}
            aria-pressed={focused}
            onFocus={() => previewIds.set(viewer, highlight.id)}
            onBlur={() => previewIds.delete(viewer)}
            style={highlight.color ? ({ '--ds-hotspot-color': highlight.color } as React.CSSProperties) : undefined}
            onClick={(event) => {
              // Pointer clicks are hit-tested in the scene; this handles keyboard activation.
              if (event.detail === 0) {
                focused ? release() : focus(highlight.id);
              }
            }}
          >
            <Slot name="highlights.hotspot" props={{ highlight, focused }}>
              <span className="ds-hotspot__content">{index + 1}</span>
            </Slot>
          </button>
        );
      })}
    </>
  );
};

const DetailPanel = ({ config }: { config: HighlightsConfig }) => {
  const viewer = useViewer();
  const { focusedId, release } = useHighlights();
  const enabled = useViewerState((s) => s.featureEnabled[FEATURE_ID] ?? false);
  const highlight = config.highlights.find((h) => h.id === focusedId);
  const tools = useModelTools(highlight?.tools ?? []);
  const features = useViewerState((s) => s.featureEnabled);
  const actions = highlight?.actions?.filter((action) => !action.requiresFeature || features[action.requiresFeature]);
  const fills = useSlotFills('highlights.detail');
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  if (!highlight || !enabled || (!highlight.description && !actions?.length && !fills.length && !tools.length)) {
    return null;
  }
  return (
    <div ref={panel} className="ds-highlight-callout">
    <Panel
      className="ds-highlight-detail"
      data-testid="ds-highlight-detail"
      title={<button type="button" className="ds-callout-handle" aria-label={`Move ${highlightLabel(highlight, config.locale)}`}
        onKeyDown={(event) => {
          const box = panel.current;
          const parent = box?.offsetParent;
          if (!box || !parent) return;
          const directions: Record<string, [number, number]> = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] };
          const step = directions[event.key];
          if (!step) return;
          event.preventDefault();
          box.style.left = Math.max(0, Math.min(parent.clientWidth - box.offsetWidth, box.offsetLeft + step[0])) + 'px';
          box.style.top = Math.max(0, Math.min(parent.clientHeight - box.offsetHeight, box.offsetTop + step[1])) + 'px';
        }}
        onPointerDown={(event) => {
          const box = panel.current;
          if (!box) return;
          drag.current = { x: event.clientX, y: event.clientY, left: box.offsetLeft, top: box.offsetTop };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onPointerMove={(event) => {
          const start = drag.current;
          const box = panel.current;
          const parent = box?.offsetParent;
          if (!start || !box || !parent) return;
          box.style.left = Math.max(0, Math.min(parent.clientWidth - box.offsetWidth, start.left + event.clientX - start.x)) + 'px';
          box.style.top = Math.max(0, Math.min(parent.clientHeight - box.offsetHeight, start.top + event.clientY - start.y)) + 'px';
        }}>
          <span className="ds-callout-index">{String(config.highlights.indexOf(highlight) + 1).padStart(2, '0')} / {String(config.highlights.length).padStart(2, '0')}</span>
          {highlightLabel(highlight, config.locale)}
        </button>}
      actions={<IconButton label="Close" icon={<X size={18} aria-hidden="true" />} data-testid="ds-highlight-detail-close" onClick={release} />}
    >
      <Slot name="highlights.detail" props={{ highlight }}>
        {highlight.description && <p>{highlight.description}</p>}
        <ModelToolControls tools={tools} surface="inline" />
        {actions?.length ? (
          <div className="ds-highlight-detail__actions" data-testid="ds-highlight-detail-actions">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="ds-highlight-detail__action" data-navigation={typeof action.run === 'object' && 'focus' in action.run ? '' : undefined}
                data-testid={`ds-highlight-action-${highlight.id}-${action.id}`}
                onClick={() => (typeof action.run === 'function' ? action.run(viewer) : runCommand(viewer, action.run))}
              >
                {action.label}{typeof action.run === 'object' && 'focus' in action.run && <ArrowRight size={16} aria-hidden="true" />}
              </button>
            ))}
          </div>
        ) : null}
      </Slot>
    </Panel>
    </div>
  );
};

/** Prev/next stepper with a popover list, like the old studio's highlight select box. */
const HighlightSelect = ({ config }: { config: HighlightsConfig }) => {
  const { focusedId, focus } = useHighlights();
  const enabled = useViewerState((s) => s.featureEnabled[FEATURE_ID] ?? false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const list = config.highlights;
  const viewer = useViewer();
  useEffect(() => () => { previewIds.delete(viewer); }, [viewer, open, enabled]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const outside = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  if (!enabled || list.length === 0) {
    return null;
  }
  const index = list.findIndex((h) => h.id === focusedId);
  const step = (delta: number) => focus(list[index < 0 ? (delta > 0 ? 0 : list.length - 1) : (index + delta + list.length) % list.length].id);
  const current = list[index];

  return (
    <div ref={rootRef} className="ds-highlight-select" data-open={open ? '' : undefined} data-testid="ds-highlight-select">
      {open && (
        <div ref={(element) => { if (element) openLists.set(viewer, element); else openLists.delete(viewer); }} className="ds-highlight-select__list" role="listbox" data-testid="ds-highlight-select-list">
          {list.map((highlight, number) => (
            <button
              key={highlight.id}
              type="button"
              data-highlight-id={highlight.id}
              role="option"
              onPointerEnter={() => previewIds.set(viewer, highlight.id)}
              onPointerLeave={() => previewIds.delete(viewer)}
              onFocus={() => previewIds.set(viewer, highlight.id)}
              onBlur={() => previewIds.delete(viewer)}
              aria-selected={highlight.id === focusedId}
              className="ds-highlight-select__entry"
              data-active={highlight.id === focusedId ? '' : undefined}
              data-testid={`ds-highlight-select-entry-${highlight.id}`}
              onClick={() => {
                focus(highlight.id);
                setOpen(false);
              }}
            >
              <span className="ds-highlight-select__number">{number + 1}</span>
              <span className="ds-highlight-select__label">{highlightLabel(highlight, config.locale)}</span>
              {highlight.id === focusedId && <Check size={16} className="ds-highlight-select__check" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
      <button type="button" aria-label="Previous highlight" className="ds-highlight-select__step ds-highlight-select__prev" data-testid="ds-highlight-prev" onClick={() => step(-1)}>
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="ds-highlight-select__current"
        data-testid="ds-highlight-select-current"
        onClick={() => setOpen((o) => !o)}
      >
        {current ? `${index + 1} · ${highlightLabel(current, config.locale)}` : 'Highlights'}
      </button>
      <button type="button" aria-label="Next highlight" className="ds-highlight-select__step ds-highlight-select__next" data-testid="ds-highlight-next" onClick={() => step(1)}>
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </div>
  );
};

/** glTF extension: `ALCM_highlights`. Hotspots are DOM buttons (`.ds-hotspot`), focus moves the camera. */
const StandaloneSelector = ({ config }: { config: HighlightsConfig }) => {
  const playback = useViewerState((s) => s.featureEnabled.animation && Boolean((s.featureState.animation as { clips?: string[] } | undefined)?.clips?.length));
  return playback ? null : <HighlightSelect config={config} />;
};

export const highlights = defineFeature<HighlightsConfig>({
  id: FEATURE_ID,
  defaults: { enabled: true, highlights: [], locale: 'en', detail: true, select: true, pauseOnHover: true },
  gltf: { extension: 'ALCM_highlights' },
  toggle: { label: 'Highlights' },
  scene: HighlightsScene,
  slots: ({ config }) => ({
    'viewer.layer': { mode: 'append', order: 0, content: <HotspotLayer config={config} /> },
    ...(config.detail
      ? { 'overlay.bottom-left': { mode: 'append' as const, order: -10, content: <DetailPanel config={config} /> } }
      : {}),
    ...(config.select === 'playback' ? { 'overlay.bottom-center': { mode: 'append' as const, order: 0, content: <StandaloneSelector config={config} /> } } : {}),
    ...(config.select ? { [config.select === 'playback' ? 'animation.controls.middle' : 'overlay.bottom-center']: { mode: 'append' as const, order: 0, content: <HighlightSelect config={config} /> } } : {}),
  }),
  setup: ({ viewer, config }) => {
    if (viewer.getState().featureState[FEATURE_ID] === undefined) {
      viewer.setFeatureState(FEATURE_ID, { focusedId: null });
    }
    const subs = [
      viewer.on$('highlight:focus').subscribe(({ id }) => viewer.setFeatureState(FEATURE_ID, { focusedId: id })),
      viewer.on$('animation:cue').subscribe(({ id: cue }) => {
        config.highlights.forEach((h) => {
          if (h.trigger?.cue === cue) {
            viewer.emit('highlight:focus', { id: h.id });
          } else if (h.trigger?.releaseCue === cue && focusedIdOf(viewer) === h.id) {
            viewer.emit('highlight:focus', { id: null });
          }
        });
      }),
    ];
    return () => subs.forEach((sub) => sub.unsubscribe());
  },
});
