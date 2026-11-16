import type { FetchLike } from '../core/with-timeout';

export interface WorkerCache {
  match(url: string): Promise<Response | undefined>;
  put(url: string, response: Response): Promise<void>;
}

export interface WorkerCacheStorage {
  open(name: string): Promise<WorkerCache>;
  keys(): Promise<string[]>;
  delete(name: string): Promise<boolean>;
}

export interface LifecycleEvent {
  waitUntil(work: Promise<unknown>): void;
}

export interface WorkerFetchEvent {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}

export interface WorkerMessageEvent {
  readonly data: unknown;
}

/**
 * The part of `ServiceWorkerGlobalScope` the worker uses. Declared structurally because the
 * `webworker` and `dom` type libraries cannot be loaded into one program, and so tests can pass a fake.
 */
export interface WorkerScope {
  /** URL of the worker script; precache entries resolve against it. */
  readonly location: { readonly href: string };
  readonly registration: { readonly scope: string };
  readonly caches: WorkerCacheStorage;
  readonly clients: { claim(): Promise<void> };
  fetch: FetchLike;
  skipWaiting(): Promise<void>;
  addEventListener(type: 'install' | 'activate', listener: (event: LifecycleEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: WorkerFetchEvent) => void): void;
  addEventListener(type: 'message', listener: (event: WorkerMessageEvent) => void): void;
}
