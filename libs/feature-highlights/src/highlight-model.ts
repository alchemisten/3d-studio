import { Vector3, type Object3D } from 'three';

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
  /** Only show the hotspot while the animation time (seconds) is within the window. */
  visibility?: { from: number; to: number; whenPlaying?: boolean };
  /** Jump the animation timeline to `targetTime` (seconds) after `delay` ms when focused. */
  animation?: { targetTime: number; delay?: number };
}

export interface AnimationSnapshot {
  time: number;
  playing: boolean;
}

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
  const inWindow = animation.time >= visibility.from && animation.time <= visibility.to;
  return inWindow && (visibility.whenPlaying !== false || !animation.playing);
};

export const highlightLabel = (highlight: Highlight, locale: string): string => {
  const { label } = highlight;
  if (!label) {
    return highlight.id;
  }
  return typeof label === 'string' ? label : (label[locale] ?? Object.values(label)[0] ?? highlight.id);
};
