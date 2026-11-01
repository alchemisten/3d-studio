import type { ReactNode } from 'react';
import { cx } from './cx';

export interface TooltipProps {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  /** Which side of the child the tooltip appears on. */
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/** CSS-only tooltip (hover and keyboard focus); SSR-safe. The label is decorative, give the child its own accessible name. */
export const Tooltip = ({ label, children, className, side = 'bottom' }: TooltipProps) => (
  <span className={cx('ds-tooltip-wrap', className)} data-side={side}>
    {children}
    <span className="ds-tooltip" aria-hidden="true">
      {label}
    </span>
  </span>
);
