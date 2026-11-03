import type { ReactNode } from 'react';

/**
 * Registry of slot names and the props their content functions receive.
 * Augment it from any package to declare new slots:
 *
 * ```ts
 * declare module '@schablone/3d-studio-ui' {
 *   interface SlotMap {
 *     'project-list.card.footer': { projectId: string };
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SlotMap {}

export type SlotName = keyof SlotMap & string;

export type SlotProps<N extends SlotName> = SlotMap[N];

export type SlotMode = 'prepend' | 'append' | 'replace';

export type SlotContent<N extends SlotName = SlotName> = ReactNode | ((props: SlotProps<N>) => ReactNode);

export interface SlotFill<N extends SlotName = SlotName> {
  id: string;
  mode: SlotMode;
  /** Lower first. Fills with equal order keep registration order. */
  order: number;
  content: SlotContent<N>;
}

/** Shorthand accepted by `slots` props: plain content, or content with mode and order. */
export type SlotFillInput<N extends SlotName = SlotName> =
  | SlotContent<N>
  | { content: SlotContent<N>; mode?: SlotMode; order?: number };

export type SlotFillsInput = { [N in SlotName]?: SlotFillInput<N> };
