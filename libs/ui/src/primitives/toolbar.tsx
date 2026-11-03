import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
}

export const Toolbar = ({ orientation = 'horizontal', label, className, ...rest }: ToolbarProps) => (
  <div {...rest} role="toolbar" aria-label={label} aria-orientation={orientation} className={cx('ds-toolbar', className)} data-orientation={orientation} />
);
