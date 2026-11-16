import { z } from 'zod';
import { AR_LANDING_PARAM } from './ar-landing';
import { toAbsoluteUrl, UnsupportedArUrlError } from './ar-links';

export type ArBakeFailure = 'aborted' | 'timeout' | 'network' | 'rejected' | 'unavailable' | 'invalid-response';

export class ArBakeError extends Error {
  public constructor(
    public readonly reason: ArBakeFailure,
    message: string,
    public readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ArBakeError';
  }
}

export interface ArBakeResult {
  cacheKey?: string;
  cached: boolean;
  usdz: string;
  /** The prepared model as GLB, when the service answers one: what Scene Viewer shows for a configured model. */
  glb?: string;
}

export interface ArBakeRequest {
  /** GET endpoint, absolute or relative to `stageUrl`; product, locale and model state travel in its query. */
  bakeUrl: string;
  stageUrl: string;
  slug: string;
  locale: string;
  /** Absolute url of the model the USDZ is prepared from. */
  glb: string;
  /** Query string of the current page; it carries the state of the model. */
  search?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export const AR_BAKE_TIMEOUT_MS = 60_000;

const bakeResponse = z.object({
  cacheKey: z.string().optional(),
  cached: z.boolean().default(false),
  usdz: z.string().min(1),
  glb: z.string().min(1).optional(),
});

const bakeRefusal = z.object({ error: z.string().min(1) });

/**
 * The landing parameter addresses the prompt and `product`/`locale` address
 * the bake, so none of them describe the model. Everything else is forwarded
 * verbatim: the service hands it to the same parser the viewer uses, which
 * drops what it does not recognise.
 */
export const buildBakeUrl = ({
  bakeUrl,
  stageUrl,
  slug,
  locale,
  search = '',
}: Pick<ArBakeRequest, 'bakeUrl' | 'stageUrl' | 'slug' | 'locale' | 'search'>): string => {
  const url = new URL(toAbsoluteUrl(bakeUrl, stageUrl));
  new URLSearchParams(search).forEach((value, key) => {
    if (key !== AR_LANDING_PARAM) url.searchParams.append(key, value);
  });
  url.searchParams.set('product', slug);
  url.searchParams.set('locale', locale);
  return url.toString();
};

interface BakeAttempt {
  payload: unknown;
  status: number;
}

/** A body that is not JSON carries nothing to read; the status decides what the failure is. */
const parseJson = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
};

const attemptBake = async (url: string, request: ArBakeRequest): Promise<BakeAttempt> => {
  const timeoutMs = request.timeoutMs ?? AR_BAKE_TIMEOUT_MS;
  const controller = new AbortController();
  const abort = () => controller.abort();
  let isTimedOut = false;
  const timer = setTimeout(() => {
    isTimedOut = true;
    controller.abort();
  }, timeoutMs);
  request.signal?.addEventListener('abort', abort);

  try {
    if (request.signal?.aborted) controller.abort();
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      method: 'GET',
      signal: controller.signal,
    });
    return { payload: parseJson(await response.text()), status: response.status };
  } catch (error) {
    if (isTimedOut) {
      throw new ArBakeError('timeout', `AR bake did not answer within ${timeoutMs} ms`, undefined, { cause: error });
    }
    if (controller.signal.aborted) {
      throw new ArBakeError('aborted', 'AR bake was cancelled', undefined, { cause: error });
    }
    throw new ArBakeError('network', 'AR bake could not be reached', undefined, { cause: error });
  } finally {
    clearTimeout(timer);
    request.signal?.removeEventListener('abort', abort);
  }
};

const toResult = ({ payload, status }: BakeAttempt, url: string): ArBakeResult => {
  if (status >= 400) {
    const refusal = bakeRefusal.safeParse(payload);
    throw new ArBakeError(
      status >= 500 ? 'unavailable' : 'rejected',
      refusal.success ? refusal.data.error : `AR bake failed with status ${status}`,
      status,
    );
  }

  const parsed = bakeResponse.safeParse(payload);
  if (!parsed.success) {
    throw new ArBakeError('invalid-response', 'AR bake answered without a USDZ url', status, { cause: parsed.error });
  }

  try {
    const { glb, ...result } = parsed.data;
    return {
      ...result,
      usdz: toAbsoluteUrl(result.usdz, url),
      ...(glb === undefined ? {} : { glb: toAbsoluteUrl(glb, url) }),
    };
  } catch (error) {
    if (!(error instanceof UnsupportedArUrlError)) throw error;
    throw new ArBakeError('invalid-response', error.message, status, { cause: error });
  }
};

/**
 * Prepares a USDZ on demand. Every failure surfaces as an `ArBakeError`; each
 * attempt is bounded by `timeoutMs`.
 *
 * A 5xx is retried once: Lambda rejects the first invocation after reclaiming
 * an idle container image, which happens whenever nobody has baked for some
 * weeks, and the retry turns that into a slow success. A 4xx is the service
 * refusing this model, so a retry would only fail the same way.
 */
export const requestArBake = async (request: ArBakeRequest): Promise<ArBakeResult> => {
  const url = buildBakeUrl(request);
  const first = await attemptBake(url, request);
  return toResult(first.status >= 500 ? await attemptBake(url, request) : first, url);
};
