import type { Anchor, Highlight, Vec3 } from '@schablone/3d-studio-feature-highlights';
import { omitKey } from '../record';

/** Resolves an anchor to a world-space point; node anchors need the loaded scene. */
export type ResolveAnchor = (anchor: Anchor) => Vec3;

/** Resolves positional anchors only; node anchors fall back to the origin. */
export const resolvePosition: ResolveAnchor = (anchor) => ('position' in anchor ? anchor.position : [0, 0, 0]);

const UP: Vec3 = [0, 1, 0];

/** Pointer lengths as fractions of the model's size (the diagonal of its bounding box). */
const DEFAULT_LENGTH_FRACTION = 0.08;
const MAX_LENGTH_FRACTION = 0.4;

type Localized = string | Record<string, string> | undefined;

export const addVectors = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const subtractVectors = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vectorLength = (vector: Vec3): number => Math.hypot(...vector);
export const scaledTo = (vector: Vec3, length: number): Vec3 => {
  const current = vectorLength(vector) || 1;
  return [(vector[0] / current) * length, (vector[1] / current) * length, (vector[2] / current) * length];
};

export const defaultPointerLength = (modelSize: number): number => DEFAULT_LENGTH_FRACTION * modelSize;
export const maxPointerLength = (modelSize: number): number => MAX_LENGTH_FRACTION * modelSize;

/** Where the hotspot shows: the pointer's label end while lifted, else the surface point. */
export const hotspotPoint = (highlight: Highlight, resolve: ResolveAnchor = resolvePosition): Vec3 =>
  resolve(highlight.anchor);

/** The point on the model the highlight is about. */
export const surfacePoint = (highlight: Highlight, resolve: ResolveAnchor = resolvePosition): Vec3 =>
  resolve(highlight.target ?? highlight.anchor);

/** The offset of a lifted hotspot from its surface point; `undefined` while it sits on the surface. */
export const liftOf = (highlight: Highlight, resolve: ResolveAnchor = resolvePosition): Vec3 | undefined => {
  if (!highlight.pointer || !highlight.target) return undefined;
  const offset = subtractVectors(resolve(highlight.anchor), resolve(highlight.target));
  return vectorLength(offset) > 0 ? offset : undefined;
};

/** Length of the pointer line; 0 while the hotspot sits on the surface. */
export const pointerLengthOf = (highlight: Highlight, resolve: ResolveAnchor = resolvePosition): number =>
  vectorLength(liftOf(highlight, resolve) ?? [0, 0, 0]);

/** The direction a pointer rises in: the stored surface normal, else its current direction, else up. */
export const pointerDirection = (highlight: Highlight, resolve: ResolveAnchor = resolvePosition): Vec3 =>
  scaledTo(highlight.normal ?? liftOf(highlight, resolve) ?? UP, 1);

const withOptional = <K extends keyof Highlight>(highlight: Highlight, key: K, value: Highlight[K] | undefined) =>
  value === undefined ? (omitKey(highlight, key) as Highlight) : { ...highlight, [key]: value };

const onSurface = (highlight: Highlight, point: Vec3): Highlight => ({
  ...omitKey(omitKey(highlight, 'target'), 'pointer'),
  anchor: { position: point },
});

const lifted = (highlight: Highlight, point: Vec3, offset: Vec3): Highlight => ({
  ...highlight,
  anchor: { position: addVectors(point, offset) },
  target: { position: point },
  pointer: highlight.pointer || true,
});

/** Puts the highlight on a new surface point and stores its normal; a pointer keeps its length. */
export const placeHighlight = (
  highlight: Highlight,
  point: Vec3,
  normal: Vec3 | undefined,
  resolve: ResolveAnchor = resolvePosition,
): Highlight => {
  const length = pointerLengthOf(highlight, resolve);
  const placed = withOptional(highlight, 'normal', normal);
  return length > 0
    ? lifted(placed, point, scaledTo(normal ?? pointerDirection(highlight, resolve), length))
    : onSurface(placed, point);
};

/** Lifts the hotspot `length` off the surface along its normal; 0 puts it back on the surface. */
export const setPointerLength = (
  highlight: Highlight,
  length: number,
  resolve: ResolveAnchor = resolvePosition,
): Highlight => {
  const point = surfacePoint(highlight, resolve);
  return length > 0
    ? lifted(highlight, point, scaledTo(pointerDirection(highlight, resolve), length))
    : onSurface(highlight, point);
};

/** Puts the label end of the pointer anywhere in space, keeping the surface point. */
export const setPointerEnd = (
  highlight: Highlight,
  position: Vec3,
  resolve: ResolveAnchor = resolvePosition,
): Highlight => {
  const point = surfacePoint(highlight, resolve);
  return lifted(highlight, point, subtractVectors(position, point));
};

/** The text of one locale. A plain string belongs to the first locale. */
export const localizedValue = (text: Localized, locale: string, locales: readonly string[]): string =>
  typeof text === 'object' ? (text[locale] ?? '') : locale === locales[0] ? (text ?? '') : '';

/** Sets the text of one locale; empty texts are dropped and nothing remains as `undefined`. */
export const setLocalizedValue = (
  text: Localized,
  locale: string,
  value: string,
  locales: readonly string[],
): Record<string, string> | undefined => {
  const current = typeof text === 'object' ? text : text ? { [locales[0] ?? locale]: text } : {};
  const next = value === '' ? omitKey(current, locale) : { ...current, [locale]: value };
  return Object.keys(next).length ? next : undefined;
};

export const setHighlightText = (
  highlight: Highlight,
  field: 'label' | 'description',
  locale: string,
  value: string,
  locales: readonly string[],
): Highlight => withOptional(highlight, field, setLocalizedValue(highlight[field], locale, value, locales));

export const setHighlightColor = (highlight: Highlight, color: string | undefined): Highlight =>
  withOptional(highlight, 'color', color);

export const setHighlightCamera = (highlight: Highlight, camera: Highlight['camera']): Highlight =>
  withOptional(highlight, 'camera', camera);

/** The node attached to the highlight: it glows and is outlined while the highlight is focused. */
export const partOf = (highlight: Highlight): string | undefined => highlight.nodes?.[0];

/** Attaches a node to the highlight, or detaches it with `undefined`. */
export const setPart = (highlight: Highlight, node: string | undefined): Highlight =>
  node
    ? { ...highlight, nodes: [node], hoverOutline: true }
    : (omitKey(omitKey(highlight, 'nodes'), 'hoverOutline') as Highlight);

export interface NewHighlight {
  id: string;
  title: string;
  /** Locale the title is written in. */
  locale: string;
  point: Vec3;
  normal?: Vec3;
  camera?: Highlight['camera'];
}

export const createHighlight = ({ id, title, locale, point, normal, camera }: NewHighlight): Highlight => ({
  id,
  label: { [locale]: title },
  anchor: { position: point },
  ...(normal ? { normal } : {}),
  ...(camera ? { camera } : {}),
});

/** An unused id of the form `highlight-<n>`, counting on from the number of highlights. */
export const nextHighlightId = (existing: readonly string[]): string => {
  const taken = new Set(existing);
  const candidates = Array.from(
    { length: existing.length + 1 },
    (_, index) => `highlight-${existing.length + 1 + index}`,
  );
  return candidates.find((id) => !taken.has(id)) ?? `highlight-${existing.length * 2 + 2}`;
};

export const updateHighlight = (
  highlights: readonly Highlight[],
  id: string,
  update: (highlight: Highlight) => Highlight,
): Highlight[] => highlights.map((highlight) => (highlight.id === id ? update(highlight) : highlight));

const withoutFocusOn = (highlight: Highlight, id: string): Highlight => {
  const actions = highlight.actions?.filter(
    ({ run }) => !(typeof run === 'object' && 'focus' in run && run.focus === id),
  );
  return actions?.length === highlight.actions?.length
    ? highlight
    : withOptional(highlight, 'actions', actions?.length ? actions : undefined);
};

/** Removes a highlight together with every action that leads to it. */
export const removeHighlight = (highlights: readonly Highlight[], id: string): Highlight[] =>
  highlights.filter((highlight) => highlight.id !== id).map((highlight) => withoutFocusOn(highlight, id));

/** Moves a highlight to an index of the list; out-of-range indices stop at the ends. */
export const reorderHighlight = (highlights: readonly Highlight[], id: string, index: number): Highlight[] => {
  const from = highlights.findIndex((highlight) => highlight.id === id);
  const to = Math.min(highlights.length - 1, Math.max(0, index));
  if (from < 0 || from === to) return [...highlights];
  const without = highlights.filter((highlight) => highlight.id !== id);
  return [...without.slice(0, to), highlights[from], ...without.slice(to)];
};

/** Moves a highlight by `delta` places; the list order is the order viewers step through. */
export const moveHighlight = (highlights: readonly Highlight[], id: string, delta: number): Highlight[] =>
  reorderHighlight(highlights, id, highlights.findIndex((highlight) => highlight.id === id) + delta);

/** The id `delta` places from a highlight, wrapping at the ends; the first or last without a current one. */
export const neighbourId = (
  highlights: readonly Highlight[],
  id: string | undefined,
  delta: number,
): string | undefined => {
  if (highlights.length === 0) return undefined;
  const index = highlights.findIndex((highlight) => highlight.id === id);
  const next =
    index < 0 ? (delta > 0 ? 0 : highlights.length - 1) : (index + delta + highlights.length) % highlights.length;
  return highlights[next].id;
};
