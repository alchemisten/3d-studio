import type { ReactNode } from 'react';
import { Badge, ProgressBar } from '@schablone/3d-studio-ui';
import { CircleAlert, CircleCheck, CloudDownload, CloudOff, RefreshCw, Trash2, WifiOff } from 'lucide-react';
import type { Connectivity } from './core/connectivity';
import type { OfflineController, OfflineState } from './core/offline-controller';
import type { OfflineMessages } from './messages';
import { useIsOnline, useOfflineState } from './use-offline-state';
import './offline.css';

const MENU_ICON_SIZE = 16;
const BADGE_ICON_SIZE = 14;

const saveAction = (state: OfflineState, messages: OfflineMessages): { label: string; icon: ReactNode } => {
  switch (state.status) {
    case 'unavailable':
      return { label: messages.unavailable, icon: <CloudOff size={MENU_ICON_SIZE} /> };
    case 'saving':
      return {
        label: `${messages.saving} ${state.done}/${state.total}`,
        icon: <CloudDownload size={MENU_ICON_SIZE} />,
      };
    case 'saved':
      return { label: messages.saved, icon: <CircleCheck size={MENU_ICON_SIZE} /> };
    case 'stale':
      return { label: messages.update, icon: <RefreshCw size={MENU_ICON_SIZE} /> };
    case 'error':
      return { label: messages.retry, icon: <RefreshCw size={MENU_ICON_SIZE} /> };
    case 'idle':
      return { label: messages.save, icon: <CloudDownload size={MENU_ICON_SIZE} /> };
  }
};

export interface OfflineControlProps {
  controller: OfflineController;
  messages: OfflineMessages;
}

/** Rows of the Output menu: save, update or retry, plus remove once a copy exists. */
export const OfflineActions = ({ controller, messages }: OfflineControlProps) => {
  const state = useOfflineState(controller);
  const { label, icon } = saveAction(state, messages);
  const isSaveDisabled = state.status === 'unavailable' || state.status === 'saving' || state.status === 'saved';
  const hasCopy = state.status === 'saved' || state.status === 'stale';
  return (
    <>
      <button
        type="button"
        role="menuitem"
        className="ds-menu__item"
        data-testid="ds-offline-save"
        disabled={isSaveDisabled}
        onClick={() => void controller.save()}
      >
        {icon} {label}
      </button>
      {hasCopy && (
        <button
          type="button"
          role="menuitem"
          className="ds-menu__item"
          data-testid="ds-offline-remove"
          onClick={() => void controller.remove()}
        >
          <Trash2 size={MENU_ICON_SIZE} /> {messages.remove}
        </button>
      )}
    </>
  );
};

export interface OfflineStatusProps extends OfflineControlProps {
  connectivity: Connectivity;
}

/** Overlay indicator: connection loss, save progress, and the state of the offline copy. Renders nothing when there is nothing to report. */
export const OfflineStatus = ({ controller, connectivity, messages }: OfflineStatusProps) => {
  const state = useOfflineState(controller);
  const isOnline = useIsOnline(connectivity);
  if (isOnline && (state.status === 'idle' || state.status === 'unavailable')) return null;
  return (
    <div className="ds-offline-status" role="status" data-testid="ds-offline-status" data-state={state.status}>
      {!isOnline && (
        <Badge>
          <WifiOff size={BADGE_ICON_SIZE} aria-hidden="true" /> {messages.offline}
        </Badge>
      )}
      {state.status === 'saving' && (
        <>
          <Badge tone="accent">
            {messages.saving} {state.done}/{state.total}
          </Badge>
          <ProgressBar label={messages.saving} value={state.total === 0 ? null : (state.done / state.total) * 100} />
        </>
      )}
      {state.status === 'saved' && (
        <Badge>
          <CircleCheck size={BADGE_ICON_SIZE} aria-hidden="true" /> {messages.saved}
        </Badge>
      )}
      {state.status === 'stale' && (
        <Badge tone="accent">
          <RefreshCw size={BADGE_ICON_SIZE} aria-hidden="true" /> {messages.stale}
        </Badge>
      )}
      {state.status === 'error' && (
        <Badge tone="danger">
          <CircleAlert size={BADGE_ICON_SIZE} aria-hidden="true" /> {messages.error}: {state.error.message}
        </Badge>
      )}
    </div>
  );
};
