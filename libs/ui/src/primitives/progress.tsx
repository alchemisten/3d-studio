import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import * as RadixProgress from '@radix-ui/react-progress';
import * as RadixSeparator from '@radix-ui/react-separator';
import { cx } from './cx';

export interface SpinnerProps {
  size?: number;
  label?: string;
  className?: string;
}

export const Spinner = ({ size = 20, label = 'Loading', className }: SpinnerProps) => (
  <span
    role="status"
    aria-label={label}
    className={cx('ds-spinner', className)}
    style={{ '--ds-spinner-size': `${size}px` } as React.CSSProperties}
    data-testid="ds-spinner"
  />
);

export interface ProgressBarProps {
  /** 0-100. Omit for an indeterminate bar. */
  value?: number | null;
  label: string;
  className?: string;
  testId?: string;
}

export const ProgressBar = ({ value = null, label, className, testId }: ProgressBarProps) => (
  <RadixProgress.Root
    value={value}
    aria-label={label}
    className={cx('ds-progress', className)}
    data-testid={testId}
    data-indeterminate={value === null ? '' : undefined}
  >
    <RadixProgress.Indicator className="ds-progress__indicator" style={{ transform: value === null ? undefined : `translateX(-${100 - value}%)` }} />
  </RadixProgress.Root>
);

export interface LoaderProps {
  /** 0-100 when known. */
  progress?: number | null;
  /** Text above the bar, e.g. "Loading model". */
  title?: ReactNode;
  /** Text below the bar, e.g. "12.4 / 30 MB". */
  detail?: ReactNode;
  className?: string;
}

/** Loading panel with spinner, progress bar, percentage and free-form detail. */
export const Loader = ({ progress = null, title = 'Loading…', detail, className }: LoaderProps) => (
  <div className={cx('ds-loader', className)} data-testid="ds-loader">
    <div className="ds-loader__header">
      <Spinner size={18} />
      <span className="ds-loader__title">{title}</span>
      {progress !== null && <span className="ds-loader__percent">{Math.round(progress)}%</span>}
    </div>
    <ProgressBar value={progress} label="Loading progress" />
    {detail && <div className="ds-loader__detail">{detail}</div>}
  </div>
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'ghost';
  active?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

/** Text button with active and loading states. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'solid', active, loading, icon, className, children, disabled, type = 'button', ...rest }, ref) => (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-pressed={active}
      className={cx('ds-button', className)}
      data-variant={variant}
      data-active={active ? '' : undefined}
      data-loading={loading ? '' : undefined}
    >
      {loading ? <Spinner size={16} /> : icon}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

export const Separator = ({ orientation = 'horizontal', className }: { orientation?: 'horizontal' | 'vertical'; className?: string }) => (
  <RadixSeparator.Root decorative orientation={orientation} className={cx('ds-separator', className)} />
);

export const Badge = ({ children, className, tone = 'neutral' }: { children: ReactNode; className?: string; tone?: 'neutral' | 'accent' | 'danger' }) => (
  <span className={cx('ds-badge', className)} data-tone={tone}>
    {children}
  </span>
);
