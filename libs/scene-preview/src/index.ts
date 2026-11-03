import { Buffer } from 'node:buffer';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep, basename } from 'node:path';
import { chromium } from 'playwright-core';
import { sceneDescriptor, type SceneDescriptor } from './descriptor.js';

export type { SceneDescriptor } from './descriptor.js';

export interface RenderOptions {
  baseDir?: string;
  executablePath?: string;
  channel?: string;
  timeout?: number;
}

export const renderScene = async (descriptor: SceneDescriptor, options: RenderOptions = {}): Promise<Buffer> => {
  const job = sceneDescriptor.parse(descriptor);
  const origin = 'http://scene-preview.localhost';
  const roots = new Map<string, string>();
  const resource = async (input: string, mount: string, directory = false) => {
    if (/^https?:\/\//i.test(input)) return input;
    const path = await realpath(resolve(options.baseDir ?? process.cwd(), input));
    roots.set(mount, directory ? path : dirname(path));
    return origin + '/' + mount + '/' + (directory ? '' : encodeURIComponent(basename(path)));
  };
  if (job.environment) job.environment = await resource(job.environment, 'environment');
  job.source = await resource(job.source, 'model');
  if (typeof job.draco === 'string') job.draco = await resource(job.draco, 'decoder', true);
  const browser = await chromium.launch({
    executablePath: options.executablePath,
    channel: options.channel,
    timeout: options.timeout ?? 30000,
  });
  try {
    const page = await browser.newPage({ viewport: { width: job.preview.width, height: job.preview.height } });
    await page.addInitScript((value) => {
      Object.assign(window, { captureJob: value });
    }, job);
    await page.route(origin + '/**', async (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname === '/')
        return route.fulfill({
          contentType: 'text/html',
          body: '<meta charset=utf-8><style>*{box-sizing:border-box}html,body,#root,.ds-viewer-theme,.ds-viewer{margin:0;width:100%;height:100%}</style><div id=root></div><script src="/capture.js"></script>',
        });
      if (pathname === '/capture.js')
        return route.fulfill({
          contentType: 'application/javascript',
          body: await readFile(new URL('./capture.js', import.meta.url)),
        });
      const [, mount, ...parts] = pathname.split('/');
      const root = roots.get(mount);
      if (!root) return route.fulfill({ status: 404 });
      try {
        const path = await realpath(resolve(root, ...parts.map(decodeURIComponent)));
        const child = relative(root, path);
        if (isAbsolute(child) || child === '..' || child.startsWith('..' + sep)) return route.fulfill({ status: 403 });
        return await route.fulfill({ path });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return route.fulfill({ status: 404 });
        throw error;
      }
    });
    await page.goto(origin, { timeout: options.timeout ?? 30000 });
    const handle = await page.waitForFunction(
      () =>
        (window as Window & { captureResult?: { png: string } | { error: string } }).captureResult ??
        (document.querySelector('[data-status=error]') && { error: document.body.innerText }),
      undefined,
      { timeout: options.timeout ?? 30000 },
    );
    const result = await handle.jsonValue();
    if (!result || 'error' in result) throw new Error(result?.error ?? 'Scene capture failed');
    return Buffer.from(result.png.slice('data:image/png;base64,'.length), 'base64');
  } finally {
    await browser.close();
  }
};
