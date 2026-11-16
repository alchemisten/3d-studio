import { useState } from 'react';
import { copyText, CopyTextError } from './copy-text';

export type CopyLinkStatus = 'idle' | 'copied' | 'failed';

export interface CopyLinkApi {
  status: CopyLinkStatus;
  copy: () => void;
}

export const useCopyLink = (url: string): CopyLinkApi => {
  const [status, setStatus] = useState<CopyLinkStatus>('idle');

  const copy = () => {
    copyText(url).then(
      () => setStatus('copied'),
      (error: unknown) => {
        if (!(error instanceof CopyTextError)) throw error;
        setStatus('failed');
      },
    );
  };

  return { copy, status };
};
