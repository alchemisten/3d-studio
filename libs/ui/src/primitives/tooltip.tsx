import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from './cx';

export interface TooltipProps {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  /** Which side of the child the tooltip appears on. */
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip = ({ label, children, className, side = 'bottom' }: TooltipProps) => {
  const wrapper = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const visible = hovered || focused;

  useEffect(() => {
    const anchor = wrapper.current;
    const tooltip = bubble.current;
    if (!visible || !anchor || !tooltip) return;
    const boundary = anchor.closest('.ds-viewer');
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const bounds = boundary?.getBoundingClientRect();
      const left = Math.max(0, bounds?.left ?? 0) + 4;
      const right = Math.min(window.innerWidth, bounds?.right ?? window.innerWidth) - 4;
      const top = Math.max(0, bounds?.top ?? 0) + 4;
      const bottom = Math.min(window.innerHeight, bounds?.bottom ?? window.innerHeight) - 4;
      tooltip.style.maxWidth = Math.max(0, right - left) + 'px';
      const { width, height } = tooltip.getBoundingClientRect();
      const gap = 4;
      let x = rect.left + (rect.width - width) / 2;
      let y = rect.top + (rect.height - height) / 2;
      if (side === 'left' || side === 'right') {
        const before = rect.left - width - gap;
        const after = rect.right + gap;
        x = (side === 'left' ? before >= left : after + width > right) ? before : after;
      } else {
        const above = rect.top - height - gap;
        const below = rect.bottom + gap;
        y = (side === 'top' ? above >= top : below + height > bottom) ? above : below;
      }
      tooltip.style.left = Math.max(left, Math.min(right - width, x)) - rect.left + 'px';
      tooltip.style.top = Math.max(top, Math.min(bottom - height, y)) - rect.top + 'px';
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(anchor);
    observer.observe(tooltip);
    if (boundary) observer.observe(boundary);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [visible, side]);

  return (
    <span
      ref={wrapper}
      className={cx('ds-tooltip-wrap', className)}
      data-side={side}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
      <span ref={bubble} className="ds-tooltip" aria-hidden="true">
        {label}
      </span>
    </span>
  );
};
