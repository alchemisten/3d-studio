import { Vector3, type Object3D } from 'three';
import type { ViewerStore } from '@schablone/3d-studio-core';

export type Vec3 = [number, number, number];

/**
 * A point in the model: static in world space, or attached to a node so it
 * follows the node while animations run. `offset` is in the node's local space.
 */
export type Anchor = { position: Vec3 } | { node: string; offset?: Vec3 };

export interface Highlight {
  id: string;
  /** Plain string, or a map of locale to label. */
  label?: string | Record<string, string>;
  /** Where the hotspot is shown and clicked. */
  anchor: Anchor;
  /** What the highlight is about. Defaults to the anchor. */
  target?: Anchor;
  /** Draw a pointer line from the anchor to the target while focused. */
  pointer?: boolean | { color?: string };
  camera: {
    position: Vec3;
    /** World-space look-at point. Defaults to following `target`. */
    target?: Vec3;
    fov?: number;
  };
  color?: string;
  /** `action` hotspots are styled as triggers. */
  kind?: 'simple' | 'action';
  /** Mesh node names that glow while the highlight is focused. */
  nodes?: string[];
  speed?: { in?: number; out?: number; fov?: number };
  /**
   * Only show the hotspot while the animation matches: time (seconds) within `from`..`to`,
   * and/or the clip (all clips when omitted) in one of the given states.
   */
  visibility?: { from?: number; to?: number; clip?: string; state?: ClipState | ClipState[] };
  /** When focused: jump the timeline to `targetTime` (seconds) after `delay` ms, then set `state`. */
  animation?: { targetTime?: number; delay?: number; state?: 'playing' | 'paused'; clip?: string };
  /** Focus this highlight when the animation crosses `cue`; release it on `releaseCue`. */
  trigger?: { cue: string; releaseCue?: string };
  /** Buttons in the default detail panel. */
  actions?: HighlightAction[];
}

export type ClipState = 'playing' | 'paused' | 'stopped';

export type HighlightCommand =
  | { seek: number }
  | { play: string | true }
  | { pause: string | true }
  | { stop: string | true }
  | { focus: string };

export interface HighlightAction {
  id: string;
  label: string;
  /** A declarative command, or a function for anything else (it receives the viewer store). */
  run: HighlightCommand | ((viewer: ViewerStore) => void);
}

export interface AnimationSnapshot {
  time: number;
  /** Per-clip state; empty when there is no animation. */
  status: Record<string, string>;
}

const overallState = (status: Record<string, string>): ClipState => {
  const values = Object.values(status);
  return values.includes('playing') ? 'playing' : values.includes('paused') ? 'paused' : 'stopped';
};

/** Runs a declarative command against the viewer's event ports. */
export const runCommand = (viewer: ViewerStore, command: HighlightCommand) => {
  if ('seek' in command) {
    viewer.emit('animation:seek', { time: command.seek });
  } else if ('play' in command) {
    viewer.emit('animation:play', { clip: command.play === true ? undefined : command.play });
  } else if ('pause' in command) {
    viewer.emit('animation:pause', { clip: command.pause === true ? undefined : command.pause });
  } else if ('stop' in command) {
    viewer.emit('animation:stop', { clip: command.stop === true ? undefined : command.stop });
  } else {
    viewer.emit('highlight:focus', { id: command.focus });
  }
};

/** Resolves an anchor to a world-space point. Falls back to the origin for unknown nodes. */
export const resolveAnchor = (anchor: Anchor, root: Object3D | undefined, out: Vector3): Vector3 => {
  if ('position' in anchor) {
    return out.set(...anchor.position);
  }
  const node = root?.getObjectByName(anchor.node);
  if (!node) {
    return out.set(0, 0, 0);
  }
  node.updateWorldMatrix(true, false);
  return node.localToWorld(out.set(...(anchor.offset ?? [0, 0, 0])));
};

export const isHighlightVisible = (highlight: Highlight, animation: AnimationSnapshot | undefined): boolean => {
  const { visibility } = highlight;
  if (!visibility || !animation) {
    return true;
  }
  const { from = -Infinity, to = Infinity, clip, state } = visibility;
  if (animation.time < from || animation.time > to) {
    return false;
  }
  if (state) {
    const current = clip ? ((animation.status[clip] as ClipState | undefined) ?? 'stopped') : overallState(animation.status);
    return (Array.isArray(state) ? state : [state]).includes(current);
  }
  return true;
};

export const highlightLabel = (highlight: Highlight, locale: string): string => {
  const { label } = highlight;
  if (!label) {
    return highlight.id;
  }
  return typeof label === 'string' ? label : (label[locale] ?? Object.values(label)[0] ?? highlight.id);
};
