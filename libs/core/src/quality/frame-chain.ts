export interface FrameChain {
  /** A frame was rendered at `now`. Returns the time since the frame before it, or `null` when that one was not adjacent. */
  rendered(now: number): number | null;
  /** A display refresh passed. Returns `false` once the chain is broken and no further refresh needs watching. */
  refreshed(): boolean;
  /** The next frame starts a new chain, e.g. after the tab was hidden. */
  interrupt(): void;
}

/**
 * Tells frames rendered on consecutive display refreshes from frames with idle refreshes between them,
 * so an on-demand render loop only yields frame times while it actually renders.
 */
export const createFrameChain = (): FrameChain => {
  let last: number | null = null;
  let hasRendered = false;
  return {
    rendered: (now) => {
      const delta = last === null ? null : now - last;
      last = now;
      hasRendered = true;
      return delta;
    },
    refreshed: () => {
      if (hasRendered) {
        hasRendered = false;
        return true;
      }
      last = null;
      return false;
    },
    interrupt: () => {
      last = null;
      hasRendered = false;
    },
  };
};
