import { OfflineUnsupportedError } from '../core/errors';
import { SKIP_WAITING_MESSAGE } from '../worker/worker-config';

export const DEFAULT_ACTIVATION_TIMEOUT_MS = 5_000;

export interface RegisterOfflineWorkerOptions {
  /** URL of the worker script the host serves, e.g. `./sw.js`. */
  url: string;
  /** Defaults to the folder of the worker script. The worker never answers navigations outside of it. */
  scope?: string;
}

/** Registers the offline worker. Rejects with `OfflineUnsupportedError` where service workers do not exist. */
export const registerOfflineWorker = ({
  url,
  scope,
}: RegisterOfflineWorkerOptions): Promise<ServiceWorkerRegistration> => {
  if (!('serviceWorker' in navigator)) {
    return Promise.reject(new OfflineUnsupportedError('Service workers are not available in this browser or context.'));
  }
  return navigator.serviceWorker
    .register(url, scope === undefined ? undefined : { scope })
    .then(async (registration) => {
      // The browser only looks for a new worker when a page inside its scope is opened. A host page outside the
      // scope (a viewer served under another address) would keep the shell of an old build for good.
      if (registration.active) {
        await registration.update();
      }
      return registration;
    });
};

const waitForEvent = (target: EventTarget, type: string, timeoutMs: number): Promise<void> =>
  new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      target.removeEventListener(type, finish);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    target.addEventListener(type, finish);
  });

export interface ReloadForNewVersionOptions {
  registration?: Pick<ServiceWorkerRegistration, 'update' | 'installing' | 'waiting'>;
  /** Emits `controllerchange` once the new worker took over, usually `navigator.serviceWorker`. */
  container: EventTarget;
  reload: () => void;
  /** How long to wait for the new worker to install, and again for it to take over. */
  timeoutMs?: number;
}

/**
 * Fetches the newest worker, lets it take over, then reloads, so the reloaded page starts from the new app shell.
 * Reloads regardless once the timeout passes.
 */
export const reloadForNewVersion = async ({
  registration,
  container,
  reload,
  timeoutMs = DEFAULT_ACTIVATION_TIMEOUT_MS,
}: ReloadForNewVersionOptions): Promise<void> => {
  if (registration) {
    await registration.update();
    if (registration.installing) await waitForEvent(registration.installing, 'statechange', timeoutMs);
    if (registration.waiting) {
      const takenOver = waitForEvent(container, 'controllerchange', timeoutMs);
      registration.waiting.postMessage(SKIP_WAITING_MESSAGE);
      await takenOver;
    }
  }
  reload();
};
