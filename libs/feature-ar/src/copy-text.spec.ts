import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText, CopyTextError } from './copy-text';

describe('copyText', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  });

  it('uses the clipboard api where the page has one', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    await copyText('https://x.test/view/tray?ar=1');

    expect(writeText).toHaveBeenCalledWith('https://x.test/view/tray?ar=1');
  });

  it('reports a refusing clipboard api as a typed error', async () => {
    const writeText = vi.fn(async () => Promise.reject(new DOMException('denied', 'NotAllowedError')));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    await expect(copyText('x')).rejects.toBeInstanceOf(CopyTextError);
  });

  it('falls back to a selected text field where a file page has no clipboard api', async () => {
    let copied: string | undefined;
    document.execCommand = vi.fn(() => {
      copied = (document.activeElement as HTMLTextAreaElement | null)?.value;
      return true;
    });

    await copyText('https://x.test/view/tray?ar=1');

    expect(copied).toBe('https://x.test/view/tray?ar=1');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('fails loud when nothing could copy', async () => {
    document.execCommand = vi.fn(() => false);

    await expect(copyText('x')).rejects.toBeInstanceOf(CopyTextError);
  });
});
