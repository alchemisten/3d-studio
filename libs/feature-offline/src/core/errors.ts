/** Base class of every failure this package raises, so hosts can tell them apart from foreign errors. */
export class OfflineError extends Error {
  public override name = 'OfflineError';
}

/** The page cannot work offline: no service worker support, no cache storage, or no worker registered. */
export class OfflineUnsupportedError extends OfflineError {
  public override name = 'OfflineUnsupportedError';
}

export class RequestTimeoutError extends OfflineError {
  public override name = 'RequestTimeoutError';

  public constructor(
    public readonly url: string,
    public readonly timeoutMs: number,
    options?: ErrorOptions,
  ) {
    super(`Request to ${url} timed out after ${timeoutMs} ms.`, options);
  }
}

export class AssetFetchError extends OfflineError {
  public override name = 'AssetFetchError';

  public constructor(
    public readonly url: string,
    public readonly status: number,
  ) {
    super(`Could not download ${url}: HTTP ${status}.`);
  }
}

export class AssetIntegrityError extends OfflineError {
  public override name = 'AssetIntegrityError';

  public constructor(
    public readonly url: string,
    reason: string,
  ) {
    super(`Downloaded ${url} is not usable: ${reason}.`);
  }
}

export class RegistryCorruptError extends OfflineError {
  public override name = 'RegistryCorruptError';

  public constructor(
    public readonly projectId: string,
    options?: ErrorOptions,
  ) {
    super(`The offline registry entry of project "${projectId}" is not readable.`, options);
  }
}

export class VersionCheckError extends OfflineError {
  public override name = 'VersionCheckError';

  public constructor(
    public readonly url: string,
    reason: string,
    options?: ErrorOptions,
  ) {
    super(`Could not read the app version from ${url}: ${reason}.`, options);
  }
}

export const toError = (value: unknown): Error => (value instanceof Error ? value : new Error(String(value)));
