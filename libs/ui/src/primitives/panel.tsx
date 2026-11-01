import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  /** Rendered next to the title, e.g. a close button. */
  actions?: ReactNode;
}

export const Panel = ({ title, actions, className, children, ...rest }: PanelProps) => (
  <section {...rest} className={cx('ds-panel', className)}>
    {(title || actions) && (
      <header className="ds-panel__header">
        <h2 className="ds-panel__title">{title}</h2>
        {actions}
      </header>
    )}
    <div className="ds-panel__body">{children}</div>
  </section>
);
