import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { IconButton } from './icon-button';
import { cx } from './cx';

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
  /** Direction the popup opens in. */
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
}

export const Menu = ({ label, icon, items, children, className, placement = 'bottom-start' }: MenuProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
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
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cx('ds-menu', className)} data-placement={placement}>
      <IconButton
        label={label}
        icon={icon}
        active={open}
        tooltip={!open}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <div id={popupId} className="ds-menu__popup" role="menu">
          {items?.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="ds-menu__item"
              disabled={item.disabled}
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          {children}
        </div>
      )}
    </div>
  );
};
