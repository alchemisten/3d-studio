import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { IconButton, ProgressBar } from '@schablone/3d-studio-ui';
import { CircleAlert, CircleCheck, CloudOff, Download, RefreshCw, Trash2, Wifi, WifiOff } from 'lucide-react';
import type { OfflineState } from './core/offline-controller';
import type { OfflineMessages } from './messages';
import type { OfflineStatusProps } from './offline-controls';
import { useIsOnline, useOfflineState } from './use-offline-state';
import './offline.css';

const BUTTON_ICON_SIZE = 20;
const ROW_ICON_SIZE = 16;
const RING_RADIUS = 10;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const percentOf = (state: Extract<OfflineState, { status: 'saving' }>): number =>
  state.total === 0 ? 0 : Math.round((state.done / state.total) * 100);

const ProgressRing = ({ percent }: { percent: number }) => (
  <svg
    className="ds-offline__ring"
    viewBox="0 0 24 24"
    width={BUTTON_ICON_SIZE}
    height={BUTTON_ICON_SIZE}
    aria-hidden="true"
  >
    <circle className="ds-offline__ring-track" cx="12" cy="12" r={RING_RADIUS} fill="none" strokeWidth="2" />
    <circle
      className="ds-offline__ring-value"
      cx="12"
      cy="12"
      r={RING_RADIUS}
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray={RING_LENGTH}
      strokeDashoffset={RING_LENGTH * (1 - percent / 100)}
      transform="rotate(-90 12 12)"
    />
    <text className="ds-offline__ring-label" x="12" y="15" textAnchor="middle">
      {percent}
    </text>
  </svg>
);

const buttonFace = (state: OfflineState, messages: OfflineMessages): { label: string; icon: ReactNode } => {
  switch (state.status) {
    case 'unavailable':
      return { label: messages.unavailable, icon: <CloudOff size={BUTTON_ICON_SIZE} /> };
    case 'saving':
      return { label: `${messages.saving} ${percentOf(state)}%`, icon: <ProgressRing percent={percentOf(state)} /> };
    case 'saved':
      return { label: messages.saved, icon: <CircleCheck size={BUTTON_ICON_SIZE} /> };
    case 'stale':
      return {
        label: messages.stale,
        icon: (
          <span className="ds-offline__mark">
            <Download size={BUTTON_ICON_SIZE} />
            <span className="ds-offline__dot" data-testid="ds-offline-dot" />
          </span>
        ),
      };
    case 'error':
      return { label: messages.error, icon: <CircleAlert size={BUTTON_ICON_SIZE} /> };
    case 'idle':
      return { label: messages.save, icon: <Download size={BUTTON_ICON_SIZE} /> };
  }
};

const statusLine = (state: OfflineState, messages: OfflineMessages): string => {
  switch (state.status) {
    case 'unavailable':
      return messages.unavailable;
    case 'saving':
      return `${messages.saving} ${state.done}/${state.total}`;
    case 'saved':
      return messages.saved;
    case 'stale':
      return messages.stale;
    case 'error':
      return `${messages.error}: ${state.error.message}`;
    case 'idle':
      return messages.notSaved;
  }
};

const saveLabel = (state: OfflineState, messages: OfflineMessages): string | undefined => {
  switch (state.status) {
    case 'idle':
      return messages.save;
    case 'stale':
      return messages.update;
    case 'error':
      return messages.retry;
    default:
      return undefined;
  }
};

/**
 * One icon button that shows the state of the offline copy and opens a popover with the connection status
 * and the actions. The popover is positioned by this package's stylesheet, never by browser defaults.
 */
export const OfflineButton = ({ controller, connectivity, messages }: OfflineStatusProps) => {
  const state = useOfflineState(controller);
  const isOnline = useIsOnline(connectivity);
  const [isOpen, setIsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popupId = useId();
  const isUnavailable = state.status === 'unavailable';
  const { label, icon } = buttonFace(state, messages);
  const save = saveLabel(state, messages);
  const hasCopy = state.status === 'saved' || state.status === 'stale';

  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={root} className="ds-offline" data-testid="ds-offline" data-state={state.status}>
      <IconButton
        ref={trigger}
        label={label}
        icon={icon}
        tooltip={false}
        title={label}
        disabled={isUnavailable}
        active={isOpen}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? popupId : undefined}
        data-testid="ds-offline-button"
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
      />
      {isOpen && !isUnavailable && (
        <div id={popupId} className="ds-menu__popup ds-offline__popup" role="menu" data-testid="ds-offline-popup">
          <div className="ds-offline__status" role="status">
            <span className="ds-offline__line" data-testid="ds-offline-connection">
              {isOnline ? (
                <Wifi size={ROW_ICON_SIZE} aria-hidden="true" />
              ) : (
                <WifiOff size={ROW_ICON_SIZE} aria-hidden="true" />
              )}
              {isOnline ? messages.online : messages.offline}
            </span>
            <span className="ds-offline__line" data-testid="ds-offline-state">
              {statusLine(state, messages)}
            </span>
            {state.status === 'saving' && <ProgressBar label={messages.saving} value={percentOf(state)} />}
          </div>
          {save !== undefined && (
            <button
              type="button"
              role="menuitem"
              className="ds-menu__item"
              data-testid="ds-offline-save"
              onClick={() => void controller.save()}
            >
              {state.status === 'idle' ? <Download size={ROW_ICON_SIZE} /> : <RefreshCw size={ROW_ICON_SIZE} />} {save}
            </button>
          )}
          {hasCopy && (
            <button
              type="button"
              role="menuitem"
              className="ds-menu__item"
              data-testid="ds-offline-remove"
              onClick={() => void controller.remove()}
            >
              <Trash2 size={ROW_ICON_SIZE} /> {messages.remove}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
