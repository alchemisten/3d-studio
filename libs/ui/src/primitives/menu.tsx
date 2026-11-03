import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { IconButton } from './icon-button';
import { cx } from './cx';
import { Switch } from './controls';

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}

export interface MenuProps {
  /** Accessible name of the trigger button. */
  label: string;
  icon: ReactNode;
  /** Simple action list. Use `children` for custom popup content. */
  items?: MenuItem[];
  children?: ReactNode;
  className?: string;
  /** Stable `data-testid` prefix: trigger `<id>`, popup `<id>-popup`, simple items `<id>-item-<item.id>`. */
  testId?: string;
  /** Direction the popup opens in. */
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
}

export const Menu = ({ label, icon, items, children, className, testId, placement = 'bottom-start' }: MenuProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popupId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const root = rootRef.current;
      if (!root || !root.contains(document.activeElement)) return;
      if (e.key === 'Escape') {
        setOpen(false);
        requestAnimationFrame(() => trigger.current?.focus());
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea, [role="slider"]')) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled):not([aria-disabled="true"])'));
      if (!items.length) return;
      e.preventDefault();
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = e.key === 'ArrowDown' ? index + 1 : index < 0 ? items.length - 1 : index - 1;
      items[(next + items.length) % items.length].focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cx('ds-menu', className)} data-placement={placement} data-open={open ? '' : undefined}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}>
      <IconButton
        ref={trigger}
        label={label}
        icon={icon}
        className="ds-menu__trigger"
        data-testid={testId}
        active={open}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <div id={popupId} className="ds-menu__popup" role="menu" onClick={(event) => {
          if (event.target instanceof Element && event.target.closest('[role="menuitem"]')) setOpen(false);
        }} data-testid={testId && `${testId}-popup`}>
          {items?.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="ds-menu__item"
              data-testid={testId && `${testId}-item-${item.id}`}
              disabled={item.disabled}
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
            >
              {item.icon}
              <span className="ds-menu__label">{item.label}</span>
            </button>
          ))}
          {children}
        </div>
      )}
    </div>
  );
};

export const MenuGroup = ({ label, children }: { label: string; children: ReactNode }) => (
  <div role="group" aria-label={label} className="ds-menu__group">
    <div className="ds-menu__heading">{label}</div>
    {children}
  </div>
);

export interface MenuCheckboxItemProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: ReactNode;
  className?: string;
  /** Rendered as `data-testid`. */
  testId?: string;
}

/** A switch row (label left, switch right) for `<Menu>` children. Keeps the menu open when toggled. */
export const MenuCheckboxItem = ({ label, checked, onChange, icon, className, testId }: MenuCheckboxItemProps) => (
  // A div row: the Radix switch is itself a button and buttons cannot nest.
  <div
    role="menuitemcheckbox"
    aria-checked={checked}
    tabIndex={0}
    className={cx('ds-menu__item', 'ds-menu__item--checkbox', className)}
    data-testid={testId}
    onClick={() => onChange(!checked)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChange(!checked);
      }
    }}
  >
    {icon}
    <span className="ds-menu__label">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} label={label} className="ds-menu__switch" decorative />
  </div>
);

export interface MenuRadioItemProps {
  label: string;
  checked: boolean;
  onSelect: () => void;
  icon?: ReactNode;
  className?: string;
  /** Rendered as `data-testid`. */
  testId?: string;
}

/** A single-choice row for `<Menu>` children. Keeps the menu open when selected. */
export const MenuRadioItem = ({ label, checked, onSelect, icon, className, testId }: MenuRadioItemProps) => (
  <button
    type="button"
    role="menuitemradio"
    aria-checked={checked}
    className={cx('ds-menu__item', 'ds-menu__item--radio', className)}
    data-testid={testId}
    onClick={onSelect}
  >
    {icon}
    <span className="ds-menu__label">{label}</span>
    {checked && <Check size={16} className="ds-menu__check" aria-hidden="true" />}
  </button>
);
