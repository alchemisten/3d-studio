import type { EditorTabDefinition } from './shell-context';

/** Tabs in display order: ids named in `tabOrder` first, in that order, then the rest by `order`. */
export const orderTabs = <T extends Pick<EditorTabDefinition, 'id' | 'order'>>(
  tabs: readonly T[],
  tabOrder: readonly string[] = [],
): T[] => {
  const rank = (tab: T) => {
    const index = tabOrder.indexOf(tab.id);
    return index < 0 ? tabOrder.length : index;
  };
  return [...tabs].sort((a, b) => rank(a) - rank(b) || (a.order ?? 0) - (b.order ?? 0));
};

const STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** Index an arrow, Home or End key moves to in a list of `count` items, wrapping at the ends. */
export const nextIndex = (key: string, current: number, count: number): number | undefined => {
  if (count === 0) return undefined;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  const step = STEPS[key];
  return step === undefined ? undefined : (Math.max(current, 0) + step + count) % count;
};

export const SIDEBAR_WIDTH = { min: 256, max: 640, initial: 352, step: 16 };

export const clampSidebarWidth = (width: number): number =>
  Math.min(SIDEBAR_WIDTH.max, Math.max(SIDEBAR_WIDTH.min, Math.round(width)));
