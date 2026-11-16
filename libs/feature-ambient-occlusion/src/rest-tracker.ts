export interface RestState {
  /** The pose changed noticeably since the frame before. */
  hasMoved: boolean;
  isResting: boolean;
  /** Milliseconds the view has been resting. */
  restedFor: number;
  /** Milliseconds until the view counts as resting when nothing moves any more. */
  wait: number;
}

export interface RestTracker {
  /** Reports the camera pose of a rendered frame; the pose is copied. */
  update(pose: ArrayLike<number>, now: number, isInteracting: boolean): RestState;
}

/**
 * Tells when a camera has kept its pose for `delayMs` without the user interacting. A change of less than
 * `tolerance` per frame does not count as motion: damped controls keep nudging the camera by amounts nobody
 * sees, and only while frames are rendered.
 */
export const createRestTracker = (delayMs: number, tolerance = 0): RestTracker => {
  let previous: number[] | null = null;
  let lastMotion = 0;
  return {
    update: (pose, now, isInteracting) => {
      const last = previous;
      const hasMoved =
        !last || last.length !== pose.length || last.some((value, index) => Math.abs(value - pose[index]) > tolerance);
      previous = Array.from(pose);
      if (hasMoved || isInteracting) lastMotion = now;
      const restedFor = now - lastMotion - delayMs;
      return { hasMoved, isResting: restedFor >= 0, restedFor: Math.max(0, restedFor), wait: Math.max(0, -restedFor) };
    },
  };
};
