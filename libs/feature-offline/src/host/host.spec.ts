import { describe, expect, it, vi } from 'vitest';
import { OfflineUnsupportedError } from '../core/errors';
import { SKIP_WAITING_MESSAGE, WORKER_CONFIG_GLOBAL } from '../worker/worker-config';
import { createPrecacheManifest, createShellVersion, createWorkerScript } from './precache-manifest';
import { registerOfflineWorker, reloadForNewVersion } from './register-worker';
import { createWebManifest } from './web-manifest';

describe('createPrecacheManifest', () => {
  const files = [
    { path: 'index.html', content: '<html>' },
    { path: 'assets/main-1f.js', content: 'main()' },
    { path: 'assets/main-1f.js.map', content: '{}' },
    { path: 'models/tray.glb', content: new Uint8Array([1, 2, 3]) },
  ];

  it('lists files by URL with content revisions and honours excludes', () => {
    const manifest = createPrecacheManifest(files, [/\.map$/, /^models\//]);

    expect(manifest.map((entry) => entry.url)).toEqual(['assets/main-1f.js', 'index.html']);
    expect(manifest.every((entry) => /^[0-9a-f]{16}$/.test(entry.revision))).toBe(true);
  });

  it('changes revision and shell version with the content', () => {
    const before = createPrecacheManifest(files);
    const after = createPrecacheManifest(
      files.map((file) => (file.path === 'index.html' ? { ...file, content: '<html lang>' } : file)),
    );

    expect(after.find((entry) => entry.url === 'index.html')?.revision).not.toBe(before[1].revision);
    expect(createShellVersion(after, 'worker')).not.toBe(createShellVersion(before, 'worker'));
    expect(createShellVersion(before, 'worker 2')).not.toBe(createShellVersion(before, 'worker'));
    expect(createShellVersion(before, 'worker')).toBe(createShellVersion(createPrecacheManifest(files), 'worker'));
  });
});

describe('createWorkerScript', () => {
  it('puts the validated config ahead of the packaged worker', () => {
    const script = createWorkerScript('installWorker();', { version: 'v1', denylist: ['^/app/other/'] });
    const assignment = `self.${WORKER_CONFIG_GLOBAL} = `;
    const [prelude, worker] = script.split('\n');

    expect(prelude.startsWith(assignment)).toBe(true);
    expect(JSON.parse(prelude.slice(assignment.length, -1))).toEqual({
      version: 'v1',
      precache: [],
      navigationFallback: null,
      denylist: ['^/app/other/'],
      networkFirst: [],
      networkTimeoutMs: 5000,
    });
    expect(worker).toBe('installWorker();');
  });

  it('refuses an invalid config at build time', () => {
    expect(() => createWorkerScript('', { version: '' })).toThrow();
    expect(() => createWorkerScript('', { version: 'v1', networkTimeoutMs: 0 })).toThrow();
  });
});

describe('createWebManifest', () => {
  const icons = [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }];

  it('maps the options onto manifest members with installable defaults', () => {
    const manifest = createWebManifest({
      name: 'Product Viewer',
      shortName: 'Viewer',
      themeColor: '#00457d',
      backgroundColor: '#ffffff',
      icons,
    });

    expect(JSON.parse(JSON.stringify(manifest))).toEqual({
      name: 'Product Viewer',
      short_name: 'Viewer',
      start_url: '.',
      scope: '.',
      display: 'standalone',
      theme_color: '#00457d',
      background_color: '#ffffff',
      icons,
    });
  });

  it('refuses a manifest browsers would not install', () => {
    expect(() =>
      createWebManifest({ name: 'Viewer', themeColor: '#000', backgroundColor: '#fff', icons: [] }),
    ).toThrow();
    expect(() => createWebManifest({ name: '', themeColor: '#000', backgroundColor: '#fff', icons })).toThrow();
  });
});

describe('registerOfflineWorker', () => {
  it('rejects where service workers do not exist', async () => {
    await expect(registerOfflineWorker({ url: './sw.js' })).rejects.toBeInstanceOf(OfflineUnsupportedError);
  });

  it('registers the worker script with the given scope', async () => {
    const registration = {};
    const register = vi.fn(async () => registration);
    vi.stubGlobal('navigator', { serviceWorker: { register } });

    try {
      expect(await registerOfflineWorker({ url: '/app/viewer/sw.js', scope: '/app/viewer/' })).toBe(registration);
      expect(await registerOfflineWorker({ url: './sw.js' })).toBe(registration);
    } finally {
      vi.unstubAllGlobals();
    }

    expect(register.mock.calls).toEqual([
      ['/app/viewer/sw.js', { scope: '/app/viewer/' }],
      ['./sw.js', undefined],
    ]);
  });
});

describe('reloadForNewVersion', () => {
  it('lets the waiting worker take over before it reloads', async () => {
    const container = new EventTarget();
    const order: string[] = [];
    const waiting = {
      postMessage: (message: unknown) => {
        order.push(`message:${JSON.stringify(message)}`);
        container.dispatchEvent(new Event('controllerchange'));
      },
    };
    const registration = {
      update: async () => void order.push('update'),
      installing: null,
      waiting,
    } as unknown as ServiceWorkerRegistration;

    await reloadForNewVersion({ registration, container, reload: () => order.push('reload') });

    expect(order).toEqual(['update', `message:${JSON.stringify(SKIP_WAITING_MESSAGE)}`, 'reload']);
  });

  it('reloads after the timeout when the worker never takes over, and at once without a registration', async () => {
    const reload = vi.fn();
    const registration = {
      update: async () => undefined,
      installing: null,
      waiting: { postMessage: () => undefined },
    } as unknown as ServiceWorkerRegistration;

    await reloadForNewVersion({ registration, container: new EventTarget(), reload, timeoutMs: 5 });
    await reloadForNewVersion({ container: new EventTarget(), reload });

    expect(reload).toHaveBeenCalledTimes(2);
  });
});
