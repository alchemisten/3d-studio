import { type MouseEvent, type PointerEvent, type ReactNode, useRef, useState } from 'react';
import type { MaterialAssignmentApi } from './use-material-assignment';

const DRAG_START_PX = 6;

interface Ghost {
  name: string;
  color?: string;
  imageUrl?: string;
  x: number;
  y: number;
}

export interface DraggedMaterial {
  id: string;
  name: string;
  color?: string;
  imageUrl?: string;
}

export interface MaterialDrag {
  /** Pointer handlers for an element that represents a material. */
  handlersFor: (material: DraggedMaterial) => {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
    onClickCapture: (event: MouseEvent<HTMLElement>) => void;
  };
  /** The swatch following the pointer while a material is dragged. */
  ghost: ReactNode;
}

/**
 * Drags a material onto a part in the 3D view with plain pointer events: the part under the pointer is
 * outlined and takes the material on release. A press without movement stays a click.
 */
export const useMaterialDrag = (assignment: MaterialAssignmentApi): MaterialDrag => {
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const drag = useRef<{ x: number; y: number; moving: boolean } | null>(null);
  const swallowClick = useRef(false);

  const finish = (event: PointerEvent<HTMLElement>, material: DraggedMaterial, drop: boolean) => {
    const current = drag.current;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (!current?.moving) return;
    swallowClick.current = true;
    setGhost(null);
    assignment.dropOn(undefined);
    const key = drop ? assignment.partAt(event.clientX, event.clientY) : undefined;
    if (key !== undefined) assignment.apply(material.id, [key]);
  };

  return {
    handlersFor: (material) => ({
      onPointerDown: (event) => {
        if (event.button !== 0) return;
        swallowClick.current = false;
        drag.current = { x: event.clientX, y: event.clientY, moving: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event) => {
        const current = drag.current;
        if (!current) return;
        if (!current.moving && Math.hypot(event.clientX - current.x, event.clientY - current.y) < DRAG_START_PX) return;
        if (!current.moving) assignment.preview(undefined);
        current.moving = true;
        setGhost({
          name: material.name,
          color: material.color,
          imageUrl: material.imageUrl,
          x: event.clientX,
          y: event.clientY,
        });
        assignment.dropOn(assignment.partAt(event.clientX, event.clientY));
      },
      onPointerUp: (event) => finish(event, material, true),
      onPointerCancel: (event) => finish(event, material, false),
      onClickCapture: (event) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        event.preventDefault();
        event.stopPropagation();
      },
    }),
    ghost: ghost && (
      <div
        className="ds-editor-drag-ghost"
        style={{ transform: `translate(${ghost.x}px, ${ghost.y}px)` }}
        data-testid="ds-editor-drag-ghost"
      >
        <span
          className="ds-editor-chip-swatch"
          style={
            {
              '--ds-swatch-color': ghost.color,
              ...(ghost.imageUrl ? { backgroundImage: `url("${ghost.imageUrl}")` } : {}),
            } as React.CSSProperties
          }
        />
        {ghost.name}
      </div>
    ),
  };
};
