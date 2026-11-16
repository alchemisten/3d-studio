import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HtmlTagDescriptor, Plugin } from 'vite';
import { OfflineError } from './core/errors';
import {
  createPrecacheManifest,
  createShellVersion,
  createWorkerScript,
  type ShellFile,
} from './host/precache-manifest';
import { createWebManifest, type WebManifestOptions } from './host/web-manifest';

export { createPrecacheManifest, createShellVersion, createWorkerScript } from './host/precache-manifest';
export type { PrecacheEntry, ShellFile } from './host/precache-manifest';
export { createWebManifest } from './host/web-manifest';
export type { WebManifest, WebManifestOptions } from './host/web-manifest';

const WEB_MANIFEST_FILE = 'manifest.webmanifest';
const VERSION_FILE = 'version.json';

export interface OfflineWorkerPluginOptions {
  /** Name of the emitted worker script, relative to the build output. Default `sw.js`. */
  fileName?: string;
  /** Precached page that answers navigations without network. Default `index.html`; `null` disables it. */
  navigationFallback?: string | null;
  /** Same-origin paths the worker never handles, e.g. another app below the same scope. Flags are not supported. */
  denylist?: readonly RegExp[];
  /** URLs answered by the network first, e.g. the project record API. Flags are not supported. */
  networkFirst?: readonly RegExp[];
  networkTimeoutMs?: number;
  /** Build output files to keep out of the precache, tested against their relative path. Source maps always are. */
  exclude?: readonly RegExp[];
  /** Emits `version.json` for `checkAppVersion`. */
  appVersion?: string;
  /** Emits `manifest.webmanifest` and links it from the HTML entry. */
  webManifest?: WebManifestOptions;
}

const toSource = (pattern: RegExp): string => {
  if (pattern.flags !== '') throw new OfflineError(`Worker patterns cannot carry flags: ${String(pattern)}.`);
  return pattern.source;
};

const readPackagedWorker = (): string => {
  const path = join(dirname(fileURLToPath(import.meta.url)), 'sw.js');
  if (!existsSync(path)) throw new OfflineError(`The packaged offline worker is missing at ${path}.`);
  return readFileSync(path, 'utf8');
};

const readShellFiles = (root: string): ShellFile[] =>
  readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const absolute = join(entry.parentPath, entry.name);
      return { path: relative(root, absolute).replaceAll('\\', '/'), content: readFileSync(absolute) };
    });

/**
 * Makes a Vite app installable and offline-capable: after the build it writes the service worker with a
 * precache manifest of the build output, and optionally `manifest.webmanifest` and `version.json`.
 */
export const offlineWorker = ({
  fileName = 'sw.js',
  navigationFallback = 'index.html',
  denylist = [],
  networkFirst = [],
  networkTimeoutMs,
  exclude = [],
  appVersion,
  webManifest,
}: OfflineWorkerPluginOptions = {}): Plugin => {
  let outDir = '';
  let base = '/';
  let isServerBuild = false;
  return {
    name: 'studio-offline-worker',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      base = config.base;
      isServerBuild = Boolean(config.build.ssr);
    },
    transformIndexHtml(): HtmlTagDescriptor[] {
      if (!webManifest) return [];
      return [
        { tag: 'link', attrs: { rel: 'manifest', href: base + WEB_MANIFEST_FILE }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'theme-color', content: webManifest.themeColor }, injectTo: 'head' },
      ];
    },
    writeBundle() {
      if (isServerBuild) return;
      if (webManifest) {
        writeFileSync(join(outDir, WEB_MANIFEST_FILE), JSON.stringify(createWebManifest(webManifest), null, 2));
      }
      if (appVersion !== undefined) {
        writeFileSync(join(outDir, VERSION_FILE), JSON.stringify({ version: appVersion }));
      }
      const workerSource = readPackagedWorker();
      const isOwnOutput = (path: string) => path === fileName || path === VERSION_FILE;
      const precache = createPrecacheManifest(
        readShellFiles(outDir).filter((file) => !isOwnOutput(file.path)),
        [/\.map$/, ...exclude],
      );
      const script = createWorkerScript(workerSource, {
        version: createShellVersion(precache, workerSource),
        precache,
        navigationFallback,
        denylist: denylist.map(toSource),
        networkFirst: networkFirst.map(toSource),
        networkTimeoutMs,
      });
      writeFileSync(join(outDir, fileName), script);
    },
  };
};
