import { createHash } from 'node:crypto';
import { WORKER_CONFIG_GLOBAL, workerConfig, type WorkerConfig, type WorkerConfigInput } from '../worker/worker-config';

export interface ShellFile {
  /** Path relative to the folder the worker script is served from, with forward slashes. */
  path: string;
  content: string | Uint8Array;
}

export type PrecacheEntry = WorkerConfig['precache'][number];

const REVISION_LENGTH = 16;

const digest = (content: string | Uint8Array): string =>
  createHash('sha256').update(content).digest('hex').slice(0, REVISION_LENGTH);

/** One entry per file that no pattern excludes, ordered by URL so the result is reproducible. */
export const createPrecacheManifest = (files: readonly ShellFile[], exclude: readonly RegExp[] = []): PrecacheEntry[] =>
  files
    .filter((file) => !exclude.some((pattern) => pattern.test(file.path)))
    .map((file) => ({ url: file.path, revision: digest(file.content) }))
    .sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));

/** Changes whenever a precached file or the worker itself changes, which is what makes browsers install the update. */
export const createShellVersion = (precache: readonly PrecacheEntry[], workerSource: string): string =>
  digest(JSON.stringify(precache) + workerSource);

/** The script a host serves as its service worker: the validated config, then the packaged worker. */
export const createWorkerScript = (workerSource: string, config: WorkerConfigInput): string =>
  `self.${WORKER_CONFIG_GLOBAL} = ${JSON.stringify(workerConfig.parse(config))};\n${workerSource}`;
