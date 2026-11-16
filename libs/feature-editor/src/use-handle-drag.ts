import type { KeyboardEvent, PointerEvent } from 'react';
import { useViewer } from '@schablone/3d-studio-core';
import { editorCameraOf } from './camera-bridge';

export interface HandleDragOptions {
  /** The pointer moved to these client coordinates; `free` while Shift is held. */
  onMove: (clientX: number, clientY: number, free: boolean) => void;
  /** The drag or key nudge ended. */
  onEnd: () => void;
}

const NUDGES: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};
const NUDGE_FAST = 10;

/**
 * Pointer and keyboard handlers for a draggable handle over the viewport: captures the pointer, switches
 * orbiting off while dragging, and moves the handle by arrow keys (Shift for ten times the step).
 */
export const useHandleDrag = ({ onMove, onEnd }: HandleDragOptions) => {
  const viewer = useViewer();
  const end = (event: PointerEvent<HTMLElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    editorCameraOf(viewer)?.setOrbitEnabled(true);
    onEnd();
  };
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      editorCameraOf(viewer)?.setOrbitEnabled(false);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) onMove(event.clientX, event.clientY, event.shiftKey);
    },
    onPointerUp: end,
    onPointerCancel: end,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      const nudge = NUDGES[event.key];
      if (!nudge) return;
      event.preventDefault();
      event.stopPropagation();
      const bounds = event.currentTarget.getBoundingClientRect();
      const step = event.shiftKey ? NUDGE_FAST : 1;
      onMove(bounds.left + bounds.width / 2 + nudge[0] * step, bounds.top + bounds.height / 2 + nudge[1] * step, false);
      onEnd();
    },
  };
};
