import type { ReactNode } from 'react';
import { cx } from './cx';

export interface ListItem {
  id: string;
  label: ReactNode;
  /** Leading visual: an icon element. */
  icon?: ReactNode;
  /** Leading visual: image URL. */
  image?: string;
  /** Leading visual: color swatch (any CSS color). */
  color?: string;
  description?: ReactNode;
  disabled?: boolean;
}

export interface ListProps {
  items: ListItem[];
  /** Id of the active item. */
  activeId?: string | null;
  onSelect?: (item: ListItem) => void;
  label: string;
  className?: string;
  /** Items render as `data-testid="<testId>-item-<id>"`. */
  testId?: string;
}

/** Selectable list with icon, image or color leading visuals and an active state. */
export const List = ({ items, activeId, onSelect, label, className, testId }: ListProps) => (
  <ul className={cx('ds-list', className)} role="listbox" aria-label={label} data-testid={testId}>
    {items.map((item) => {
      const active = item.id === activeId;
      return (
        <li key={item.id} role="presentation">
          <button
            type="button"
            role="option"
            aria-selected={active}
            disabled={item.disabled}
            className="ds-list__item"
            data-active={active ? '' : undefined}
            data-testid={testId && `${testId}-item-${item.id}`}
            onClick={() => onSelect?.(item)}
          >
            {item.image ? (
              <img className="ds-list__visual ds-list__image" src={item.image} alt="" />
            ) : item.color ? (
              <span className="ds-list__visual ds-list__swatch" style={{ '--ds-swatch-color': item.color } as React.CSSProperties} aria-hidden="true" />
            ) : item.icon ? (
              <span className="ds-list__visual ds-list__icon" aria-hidden="true">
                {item.icon}
              </span>
            ) : null}
            <span className="ds-list__text">
              <span className="ds-list__label">{item.label}</span>
              {item.description && <span className="ds-list__description">{item.description}</span>}
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);
