import { createContext, useContext, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { SlotStore } from './slot-store';
import type { SlotFill, SlotFillInput, SlotFillsInput } from './types';

interface SlotContextValue {
  store: SlotStore;
  /** Static fills from props. Available during SSR. */
  staticFills: SlotFillsInput;
}

const SlotContext = createContext<SlotContextValue | null>(null);

export interface SlotProviderProps {
  /** Static fills, resolved at render time (SSR-safe). */
  slots?: SlotFillsInput;
  children?: ReactNode;
}

/**
 * Provides a slot registry. Nested providers are isolated from each other,
 * except that they inherit nothing: put one provider per viewer / page.
 */
export const SlotProvider = ({ slots, children }: SlotProviderProps) => {
  const storeRef = useRef<SlotStore>();
  storeRef.current ??= new SlotStore();
  const value = useMemo(() => ({ store: storeRef.current as SlotStore, staticFills: slots ?? {} }), [slots]);
  return <SlotContext.Provider value={value}>{children}</SlotContext.Provider>;
};

export const useSlotContext = (): SlotContextValue => {
  const ctx = useContext(SlotContext);
  if (!ctx) {
    throw new Error('Slot components must be rendered inside <SlotProvider>.');
  }
  return ctx;
};

const isFillObject = (input: SlotFillInput): input is Exclude<SlotFillInput, ReactNode | ((p: never) => ReactNode)> =>
  typeof input === 'object' && input !== null && !Array.isArray(input) && 'content' in input && !('$$typeof' in input);

const normalize = (name: string, input: SlotFillInput): SlotFill =>
  isFillObject(input)
    ? { id: `static:${name}`, mode: input.mode ?? 'replace', order: input.order ?? 0, content: input.content }
    : { id: `static:${name}`, mode: 'replace', order: 0, content: input };

/** All fills (static and dynamic) for a slot, ordered. */
export const useSlotFills = (name: string): readonly SlotFill[] => {
  const { store, staticFills } = useSlotContext();
  const dynamic = useSyncExternalStore(
    store.subscribe,
    () => store.get(name),
    () => store.get(name),
  );
  return useMemo(() => {
    const input = (staticFills as Record<string, SlotFillInput | undefined>)[name];
    if (input === undefined || input === null) {
      return dynamic;
    }
    return [normalize(name, input), ...dynamic].sort((a, b) => a.order - b.order);
  }, [staticFills, dynamic, name]);
};
