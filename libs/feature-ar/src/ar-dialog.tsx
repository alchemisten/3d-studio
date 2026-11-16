import { useEffect, useId, useMemo, useRef } from 'react';
import { Button, IconButton } from '@schablone/3d-studio-ui';
import { Box, Copy, X } from 'lucide-react';
import { formatDimensions } from './ar-assets';
import type { ArLabelKey, ArLabels } from './ar-i18n';
import { qrCodeDataUrl } from './ar-qr';
import type { ArState } from './ar-state';
import type { Platform } from './device-detection';
import type { ArApi } from './use-ar';
import { type CopyLinkStatus, useCopyLink } from './use-copy-link';
import './ar.css';

const COPY_LABEL: Record<CopyLinkStatus, ArLabelKey> = {
  copied: 'copied',
  failed: 'copyFailed',
  idle: 'copyLink',
};

const HANDOVER_STATES: readonly ArState[] = ['qr', 'copy'];

const CopyLink = ({ labels, url }: { labels: ArLabels; url: string }) => {
  const { copy, status } = useCopyLink(url);
  return (
    <>
      <p className="ds-ar-dialog__link" data-testid="ds-ar-link">
        {url}
      </p>
      <Button variant="ghost" icon={<Copy size={16} aria-hidden="true" />} onClick={copy}>
        <span role="status">{labels[COPY_LABEL[status]]}</span>
      </Button>
    </>
  );
};

const QrCode = ({ url }: { url: string }) => {
  const source = useMemo(() => qrCodeDataUrl(url), [url]);
  return <img className="ds-ar-dialog__code" alt="" src={source} data-testid="ds-ar-qr" />;
};

const ArDialogBody = ({ ar, platform }: ArDialogProps) => {
  const { asset, labels, landingUrl, start, state } = ar;
  const dimensions = formatDimensions(asset.dimensionsMm);

  switch (state.status) {
    case 'qr':
      return (
        <>
          <QrCode url={landingUrl} />
          <p className="ds-ar-dialog__hint">{labels.qrHint}</p>
          <CopyLink labels={labels} url={landingUrl} />
        </>
      );
    case 'copy':
      return (
        <>
          <p className="ds-ar-dialog__hint">{platform === 'android' ? labels.copyHintAndroid : labels.copyHintIos}</p>
          <CopyLink labels={labels} url={landingUrl} />
        </>
      );
    case 'launch':
    case 'ready':
      return (
        <>
          <Button icon={<Box size={16} aria-hidden="true" />} onClick={start}>
            {labels.start}
          </Button>
          {dimensions && <p className="ds-ar-dialog__dimensions">{dimensions}</p>}
          <p className="ds-ar-dialog__hint">{labels.hint}</p>
        </>
      );
    case 'preparing':
      return (
        <>
          <Button loading>{labels.preparing}</Button>
          <p className="ds-ar-dialog__hint" role="status">
            {labels.preparingHint}
          </p>
        </>
      );
    case 'error':
      return (
        <>
          <p className="ds-ar-dialog__error" role="alert">
            {state.error === 'bake-failed' ? labels.errorBakeFailed : labels.errorUsdzMissing}
          </p>
          {state.error === 'bake-failed' && <Button onClick={start}>{labels.retry}</Button>}
        </>
      );
    case 'closed':
      return null;
  }
};

export interface ArDialogProps {
  ar: ArApi;
  platform: Platform;
}

export const ArDialog = ({ ar, platform }: ArDialogProps) => {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const { close, labels, state } = ar;
  const isOpen = state.status !== 'closed';

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (isOpen && !element.open) element.showModal();
    if (!isOpen && element.open) element.close();
  }, [isOpen]);

  return (
    <dialog
      className="ds-ar-dialog"
      aria-labelledby={titleId}
      data-state={state.status}
      data-testid="ds-ar-dialog"
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {isOpen && (
        <div className="ds-ar-dialog__panel">
          <header className="ds-ar-dialog__header">
            <h2 id={titleId}>{HANDOVER_STATES.includes(state.status) ? labels.qrTitle : labels.modalTitle}</h2>
            <IconButton
              label={labels.close}
              icon={<X size={18} aria-hidden="true" />}
              tooltip={false}
              onClick={close}
            />
          </header>
          <ArDialogBody ar={ar} platform={platform} />
        </div>
      )}
    </dialog>
  );
};
