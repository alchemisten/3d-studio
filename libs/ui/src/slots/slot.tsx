import { Fragment, useEffect, useId, useLayoutEffect, type ReactNode } from 'react';
import { useSlotContext, useSlotFills } from './slot-context';
import type { SlotContent, SlotFill, SlotMode, SlotName, SlotProps } from './types';

const useIsomorphicLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

const render = <N extends SlotName>(content: SlotContent<N>, props: SlotProps<N>): ReactNode =>
  typeof content === 'function' ? (content as (p: SlotProps<N>) => ReactNode)(props) : content;

export interface SlotComponentProps<N extends SlotName> {
  name: N;
  /** Props passed to function fills. */
  props?: SlotProps<N>;
  /** Default content; replaced by a `replace` fill, surrounded by prepend/append fills. */
  children?: ReactNode;
}

/**
 * A named extension point. Renders prepend fills, then the default children
 * (or the last `replace` fill), then append fills.
 */
export const Slot = <N extends SlotName>({ name, props, children }: SlotComponentProps<N>) => {
  const fills = useSlotFills(name) as readonly SlotFill<N>[];
  const resolvedProps = (props ?? {}) as SlotProps<N>;
  const replacement = [...fills].reverse().find((f) => f.mode === 'replace');

  return (
    <>
      {fills
        .filter((f) => f.mode === 'prepend')
        .map((f) => (
          <Fragment key={f.id}>{render(f.content, resolvedProps)}</Fragment>
        ))}
      {replacement ? render(replacement.content, resolvedProps) : children}
      {fills
        .filter((f) => f.mode === 'append')
        .map((f) => (
          <Fragment key={f.id}>{render(f.content, resolvedProps)}</Fragment>
        ))}
    </>
  );
};

export interface SlotFillOptions<N extends SlotName> {
  mode?: SlotMode;
  order?: number;
  /** Stable id; defaults to a generated one. Reuse an id to overwrite a fill. */
  id?: string;
  content: SlotContent<N>;
}

/** Registers a fill for the lifetime of the calling component. */
export const useSlotFill = <N extends SlotName>(name: N, options: SlotFillOptions<N>): void => {
  const { store } = useSlotContext();
  const generatedId = useId();
  const id = options.id ?? generatedId;
  const mode = options.mode ?? 'append';
  const order = options.order ?? 0;

  useIsomorphicLayoutEffect(() => store.add(name, { id, mode, order, content: options.content as SlotContent }), [store, name, id, mode, order]);

  useIsomorphicLayoutEffect(() => {
    store.update(name, id, { content: options.content as SlotContent });
  }, [store, name, id, options.content]);
};

export interface SlotFillProps<N extends SlotName> extends Omit<SlotFillOptions<N>, 'content'> {
  name: N;
  children: SlotContent<N>;
}

/** Declarative fill. Renders nothing in place; its children appear where the slot is rendered. */
const SlotFillComponent = <N extends SlotName>({ name, children, ...options }: SlotFillProps<N>) => {
  useSlotFill(name, { ...options, content: children });
  return null;
};

Slot.Fill = SlotFillComponent;
