import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BufferGeometry, Color, Float32BufferAttribute, Line, LineBasicMaterial, Mesh, PerspectiveCamera, Vector3 } from 'three';
import type { Material, Object3D } from 'three';
import {
  defineFeature,
  useFeature,
  useFeatureEnabled,
  useViewer,
  useViewerState,
  type ViewerStore,
} from '@schablone/3d-studio-core';
import { IconButton, Panel, Slot } from '@schablone/3d-studio-ui';
import './highlights.css';
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
const DEFAULT_SPEED = { in: 3, out: 6, fov: 6 };

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
  const color = typeof highlight.pointer === 'object' ? highlight.pointer.color : undefined;
  const line = useRef<Line>(null);
  const dot = useRef<Mesh>(null);
  const a = useRef(new Vector3());
  const b = useRef(new Vector3());
  const geometry = useRef(new BufferGeometry().setAttribute('position', new Float32BufferAttribute(6, 3)));
  const lineObject = useRef<Line | null>(null);
  lineObject.current ??= new Line(geometry.current, new LineBasicMaterial({ color: color ?? highlight.color ?? '#ffffff' }));

  useFrame(() => {
    resolveAnchor(highlight.anchor, gltf?.scene, a.current);
    resolveAnchor(highlight.target ?? highlight.anchor, gltf?.scene, b.current);
    const position = geometry.current.getAttribute('position');
    position.setXYZ(0, a.current.x, a.current.y, a.current.z);
    position.setXYZ(1, b.current.x, b.current.y, b.current.z);
    position.needsUpdate = true;
    geometry.current.computeBoundingSphere();
    dot.current?.position.copy(b.current);
    if (line.current) {
      line.current.visible = isHighlightVisible(highlight, animationSnapshot(viewer));
    }
  });

  return (
    <>
      <primitive ref={line} object={lineObject.current} />
      <mesh ref={dot}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshBasicMaterial color={color ?? highlight.color ?? '#ffffff'} />
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
  const gl = useThree((s) => s.gl);
  // Hotspots slide while animations run, so native :hover would flicker; hit-test against projected positions instead.
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const points = useRef<Array<{ id: string; x: number; y: number }>>([]);
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
      saved.current ??= { position: camera.position.clone(), target: currentTarget(), fov: camera.fov };
      const speed = { ...DEFAULT_SPEED, ...focused.speed };
      goal.current = {
        position: new Vector3(...focused.camera.position),
        target: focused.camera.target ? new Vector3(...focused.camera.target) : currentTarget(),
        fov: focused.camera.fov ?? camera.fov,
        speed: { position: speed.in, fov: speed.fov },
        followTarget: !focused.camera.target,
      };
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
    const touched: Array<{ material: Material & { emissive: Color }; original: Color }> = [];
    focused.nodes.forEach((name) => {
      gltf.scene.getObjectByName(name)?.traverse((object: Object3D) => {
        const material = (object as Mesh).material as (Material & { emissive?: Color }) | undefined;
        if (material?.emissive) {
          touched.push({ material: material as Material & { emissive: Color }, original: material.emissive.clone() });
          material.emissive.set(focused.color ?? '#ffffff').multiplyScalar(0.4);
        }
      });
    });
    return () => touched.forEach(({ material, original }) => material.emissive.copy(original));
  }, [focused, gltf]);

  useFrame((_, delta) => {
    const root = gltf?.scene;
    const animation = animationSnapshot(viewer);
    const { world, target } = tmp.current;

    const visiblePoints: Array<{ id: string; x: number; y: number }> = [];
    hotspotsOf(viewer).forEach((element, id) => {
      const highlight = config.highlights.find((h) => h.id === id);
      if (!highlight) {
        return;
      }
      resolveAnchor(highlight.anchor, root, world).project(camera);
      const hidden = !enabled || world.z > 1 || !isHighlightVisible(highlight, animation);
      element.toggleAttribute('data-hidden', hidden);
      element.setAttribute('data-positioned', '');
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
    hotspotsOf(viewer).forEach((element, id) => element.toggleAttribute('data-hover', id === hovered.current));
    gl.domElement.style.cursor = hovered.current ? 'pointer' : '';

    const current = goal.current;
    const followed = focused && (!focused.camera.target || 'node' in (focused.target ?? focused.anchor));
    if (focused && (current?.followTarget || followed)) {
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
      if (settled && Math.abs(camera.fov - current.fov) < 0.01) {
        goal.current = null;
      }
    } else if (focused && controls && followed && 'node' in (focused.target ?? focused.anchor)) {
      controls.target.copy(target);
    }
  });

  return focused?.pointer ? <PointerLine highlight={focused} /> : null;
};

const HotspotLayer = ({ config }: { config: HighlightsConfig }) => {
  const viewer = useViewer();
  const { focusedId, focus, release } = useHighlights();
  return (
    <>
      {config.highlights.map((highlight) => {
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
            style={highlight.color ? ({ '--ds-hotspot-color': highlight.color } as React.CSSProperties) : undefined}
            onClick={(event) => {
              // Pointer clicks are hit-tested in the scene; this handles keyboard activation.
              if (event.detail === 0) {
                focused ? release() : focus(highlight.id);
              }
            }}
          >
            <Slot name="highlights.hotspot" props={{ highlight, focused }}>
              <span className="ds-hotspot__content" />
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
  if (!highlight || !enabled) {
    return null;
  }
  return (
    <Panel
      className="ds-highlight-detail"
      data-testid="ds-highlight-detail"
      title={highlightLabel(highlight, config.locale)}
      actions={<IconButton label="Close" icon="✕" data-testid="ds-highlight-detail-close" onClick={release} />}
    >
      <Slot name="highlights.detail" props={{ highlight }}>
        {highlight.actions?.length ? (
          <div className="ds-highlight-detail__actions" data-testid="ds-highlight-detail-actions">
            {highlight.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="ds-highlight-detail__action"
                data-testid={`ds-highlight-action-${highlight.id}-${action.id}`}
                onClick={() => (typeof action.run === 'function' ? action.run(viewer) : runCommand(viewer, action.run))}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </Slot>
    </Panel>
  );
};

/** glTF extension: `ALCM_highlights`. Hotspots are DOM buttons (`.ds-hotspot`), focus moves the camera. */
export const highlights = defineFeature<HighlightsConfig>({
  id: FEATURE_ID,
  defaults: { enabled: true, highlights: [], locale: 'en', detail: true, pauseOnHover: true },
  gltf: { extension: 'ALCM_highlights' },
  toggle: { label: 'Highlights' },
  scene: HighlightsScene,
  slots: ({ config }) => ({
    'viewer.layer': { mode: 'append', order: 0, content: <HotspotLayer config={config} /> },
    ...(config.detail
      ? { 'overlay.bottom-left': { mode: 'append' as const, order: 0, content: <DetailPanel config={config} /> } }
      : {}),
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
