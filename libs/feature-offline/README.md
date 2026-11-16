# @schablone/3d-studio-feature-offline

Makes a 3D Studio viewer page installable and usable without network.

- `offline` — viewer feature: one button in the bottom-right overlay corner. The button shows the state
  (download, progress ring with percentage, check, update dot, failure, disabled where offline use is
  impossible) and opens a popover with the connection status and "Make available offline" / update / remove.
  `placement: 'output'` puts the actions into the Output menu and a status badge top-right instead.
  German and English.
- `@schablone/3d-studio-feature-offline/sw` — the service worker, one dependency-free script.
- `@schablone/3d-studio-feature-offline/vite` — Vite plugin that ships the worker with a precache manifest of
  the build, a `manifest.webmanifest` and a `version.json`.
- A framework-free core for hosts that build their own UI: `createOfflineController`, `saveProject`,
  `removeProject`, `revalidateProject`, `checkAppVersion`, `watchAppVersion`, `watchConnectivity`.

## Wiring a Vite app

```ts
// vite.config.ts
import { offlineWorker } from '@schablone/3d-studio-feature-offline/vite';

export default defineConfig({
  base: '/app/viewer/',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    offlineWorker({
      appVersion: version,
      networkFirst: [/\/api\/projects\//],
      webManifest: {
        name: 'Product viewer',
        themeColor: '#00457d',
        backgroundColor: '#ffffff',
        icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    }),
  ],
});
```

```tsx
// main.tsx
import { Viewer } from '@schablone/3d-studio-core';
import {
  checkAppVersion,
  createReloadGuard,
  offline,
  registerOfflineWorker,
  reloadForNewVersion,
  watchAppVersion,
} from '@schablone/3d-studio-feature-offline';
import '@schablone/3d-studio-feature-offline/style.css';

if (import.meta.env.PROD) {
  const registration = await registerOfflineWorker({ url: `${import.meta.env.BASE_URL}sw.js` });
  watchAppVersion({
    window,
    document,
    onError: (error) => logger.warn(error),
    check: () =>
      checkAppVersion({
        url: new URL('version.json', document.baseURI).href,
        fetch: (input, init) => fetch(input, init),
        current: __APP_VERSION__,
        guard: createReloadGuard(localStorage, 'viewer:reloaded-for-version'),
        reload: () =>
          reloadForNewVersion({
            registration,
            container: navigator.serviceWorker,
            reload: () => window.location.reload(),
          }),
      }),
  });
}

<Viewer
  source={modelUrl}
  features={[
    offline.use({
      enabled: true,
      projectId: slug,
      locale: 'de',
      assets: [modelUrl, environmentUrl, `/api/projects/${slug}`],
    }),
  ]}
/>;
```

`assets` lists everything the project needs offline. A copy is outdated when that list changes or when the
ETag / Last-Modified of a saved asset differs from the server.

## What the worker does

| Request                                     | Answer                                                            |
| ------------------------------------------- | ----------------------------------------------------------------- |
| Navigation inside the registration scope    | Network, else the precached `navigationFallback`                  |
| Navigation outside the scope, or `denylist` | Not handled                                                       |
| `networkFirst` pattern                      | Network (5 s), else the saved copy                                |
| Other `GET`                                 | Precached shell or saved project asset when present, else network |
| Not `GET`, `Range`, `cache: 'no-store'`     | Not handled                                                       |

Cache names carry the registration scope and, for the app shell, the build version; activation deletes the
outdated caches of its own scope only. A new worker waits until every page is closed, or until a page sends
`SKIP_WAITING_MESSAGE` (`reloadForNewVersion` does).

Register the worker with the narrowest scope that covers the page. Other apps below that scope go on the
`denylist`: `offlineWorker({ denylist: [/^\/app\/viewer\/admin\//] })`.

## Without Vite

Serve `@schablone/3d-studio-feature-offline/sw` behind a script that sets the config first:

```js
// sw.js
self.__STUDIO_OFFLINE_WORKER__ = {
  version: '2026-11-15',
  precache: [{ url: 'index.html', revision: '3f9a' }],
  navigationFallback: 'index.html',
  networkFirst: ['/api/projects/'],
};
importScripts('./studio-offline-worker.js');
```

`createPrecacheManifest`, `createShellVersion`, `createWorkerScript` and `createWebManifest` from
`@schablone/3d-studio-feature-offline/vite` produce those values in any Node build script.
