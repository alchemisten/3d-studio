import { expect, it, vi } from 'vitest';
import { chromium } from 'playwright-core';
import { renderScene } from './index';

vi.mock('playwright-core', () => ({ chromium: { launch: vi.fn() } }));

it('passes the requested landscape dimensions to the capture viewport', async () => {
  const page = {
    addInitScript: vi.fn(),
    route: vi.fn(),
    goto: vi.fn(),
    waitForFunction: vi.fn().mockResolvedValue({
      jsonValue: async () => ({ png: 'data:image/png;base64,AQ==' }),
    }),
  };
  const newPage = vi.fn().mockResolvedValue(page);
  vi.mocked(chromium.launch).mockResolvedValue({
    newPage,
    close: vi.fn(),
  } as unknown as Awaited<ReturnType<typeof chromium.launch>>);

  await renderScene({ source: 'https://example.org/model.glb', preview: { width: 320, height: 180 } });

  expect(newPage).toHaveBeenCalledWith({ viewport: { width: 320, height: 180 } });
});
