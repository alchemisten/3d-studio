export const OVERLAY_REGIONS = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;

export type OverlayRegion = (typeof OVERLAY_REGIONS)[number];

export const regionSlot = <R extends OverlayRegion>(region: R) => `overlay.${region}` as const;

declare module '../slots/types' {
  interface SlotMap {
    'overlay.top-left': Record<string, never>;
    'overlay.top-center': Record<string, never>;
    'overlay.top-right': Record<string, never>;
    'overlay.middle-left': Record<string, never>;
    'overlay.center': Record<string, never>;
    'overlay.middle-right': Record<string, never>;
    'overlay.bottom-left': Record<string, never>;
    'overlay.bottom-center': Record<string, never>;
    'overlay.bottom-right': Record<string, never>;
  }
}
