import type { ReactNode } from 'react';
import { Slot, useSlotFill, type SlotFillProps } from '../slots';
import { useSlotContext, useSlotFills } from '../slots/slot-context';
import { IconButton } from '../primitives/icon-button';
import { cx } from '../primitives/cx';
import { OVERLAY_REGIONS, regionSlot, type OverlayRegion } from './regions';

export interface OverlayProps {
  className?: string;
  /** `<Overlay.TopRight>` style fills, or anything else you want to render inside the overlay layer. */
  children?: ReactNode;
}

const Region = ({ region }: { region: OverlayRegion }) => {
  const name = regionSlot(region);
  const fills = useSlotFills(name);
  if (fills.length === 0) {
    return null;
  }
  return (
    <div className={`ds-overlay__region ds-overlay__region--${region}`} data-region={region} data-testid={`ds-overlay-region-${region}`}>
      <Slot name={name} />
    </div>
  );
};

/**
 * Full-size layer with nine regions (corners, edges, center). Regions render only when
 * they contain items. Place it over a canvas; pointer events pass through empty areas.
 */
export const Overlay = ({ className, children }: OverlayProps) => {
  useSlotContext();
  return (
    <div className={cx('ds-overlay', className)} data-testid="ds-overlay">
      {children}
      {OVERLAY_REGIONS.map((region) => (
        <Region key={region} region={region} />
      ))}
    </div>
  );
};

type RegionFillProps = Omit<SlotFillProps<never>, 'name' | 'children'> & { children: ReactNode };

const regionComponent = (region: OverlayRegion) => {
  const Fill = ({ children, ...options }: RegionFillProps) => {
    useSlotFill(regionSlot(region), { ...(options as object), content: children });
    return null;
  };
  Fill.displayName = `Overlay.${region}`;
  return Fill;
};

Overlay.TopLeft = regionComponent('top-left');
Overlay.TopCenter = regionComponent('top-center');
Overlay.TopRight = regionComponent('top-right');
Overlay.MiddleLeft = regionComponent('middle-left');
Overlay.Center = regionComponent('center');
Overlay.MiddleRight = regionComponent('middle-right');
Overlay.BottomLeft = regionComponent('bottom-left');
Overlay.BottomCenter = regionComponent('bottom-center');
Overlay.BottomRight = regionComponent('bottom-right');

export interface OverlayItemBase {
  /** Stable id. Re-adding an id overwrites the previous item. */
  id: string;
  /** Lower first within the region. */
  order?: number;
}

export interface OverlayButtonItem extends OverlayItemBase {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
}

export interface OverlayContentItem extends OverlayItemBase {
  content: ReactNode;
}

export type OverlayItem = OverlayButtonItem | OverlayContentItem;

export const renderOverlayItem = (item: OverlayItem): ReactNode =>
  'content' in item ? (
    item.content
  ) : (
    <IconButton key={item.id} label={item.label} icon={item.icon} active={item.active} onClick={item.onClick} />
  );
