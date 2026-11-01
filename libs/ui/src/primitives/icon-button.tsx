import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from './cx';
import { Tooltip } from './tooltip';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Accessible name; also used as tooltip text. */
  label: string;
  /** The icon element (any ReactNode, e.g. an inline SVG). */
  icon: ReactNode;
  /** Set to `false` to disable the tooltip. */
  tooltip?: boolean;
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, tooltip = true, active, className, type = 'button', ...rest }, ref) => {
    const button = (
      <button
        {...rest}
        ref={ref}
        type={type}
        aria-label={label}
        aria-pressed={active}
        className={cx('ds-icon-button', className)}
        data-active={active ? '' : undefined}
      >
        <span className="ds-icon-button__icon">{icon}</span>
      </button>
    );
    return tooltip ? <Tooltip label={label}>{button}</Tooltip> : button;
  },
);
IconButton.displayName = 'IconButton';
