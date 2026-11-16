import { RequestTimeoutError } from './errors';

export type FetchLike = (input: string | Request, init?: RequestInit) => Promise<Response>;

export interface TimeoutOptions {
  /** Named in the timeout error. */
  url: string;
  timeoutMs: number;
  /** Cancels the work from outside; its reason is rethrown. */
  signal?: AbortSignal;
}

/**
 * Runs `work` with a signal that aborts after `timeoutMs` or when the outer signal does.
 * The deadline covers everything `work` awaits, including reading a response body.
 */
export const withTimeout = async <T>(
  { url, timeoutMs, signal }: TimeoutOptions,
  work: (signal: AbortSignal) => Promise<T>,
): Promise<T> => {
  const controller = new AbortController();
  const forward = () => controller.abort(signal?.reason);
  if (signal?.aborted) forward();
  signal?.addEventListener('abort', forward, { once: true });
  let isTimedOut = false;
  const timer = setTimeout(() => {
    isTimedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await work(controller.signal);
  } catch (error) {
    if (isTimedOut) throw new RequestTimeoutError(url, timeoutMs, { cause: error });
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forward);
  }
};
