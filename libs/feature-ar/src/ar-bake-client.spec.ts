import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArBakeError, type ArBakeRequest, buildBakeUrl, requestArBake } from './ar-bake-client';

const SCRIPT_URL = ['javascript', 'alert(1)'].join(':');

const request: ArBakeRequest = {
  bakeUrl: '/api/ar/bake',
  glb: 'https://x.test/projects/tray/m.glb',
  locale: 'de',
  slug: 'tray',
  stageUrl: 'https://x.test/',
};

const respond = (status: number, body: unknown) => ({
  status,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});

const failure = async (promise: Promise<unknown>): Promise<ArBakeError> => {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ArBakeError);
  return error as ArBakeError;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('buildBakeUrl', () => {
  it('forwards the configuration and addresses the bake', () => {
    const url = new URL(buildBakeUrl({ ...request, search: '?h=320&g=Shell_Shell' }));

    expect(url.origin + url.pathname).toBe('https://x.test/api/ar/bake');
    expect(url.searchParams.get('product')).toBe('tray');
    expect(url.searchParams.get('locale')).toBe('de');
    expect(url.searchParams.get('h')).toBe('320');
    expect(url.searchParams.get('g')).toBe('Shell_Shell');
  });

  it('drops the landing parameter so it cannot reach the cache key', () => {
    expect(new URL(buildBakeUrl({ ...request, search: '?ar=1&h=320' })).searchParams.get('ar')).toBeNull();
  });

  it('does not let a query parameter override the addressing ones', () => {
    const { searchParams } = new URL(buildBakeUrl({ ...request, search: '?product=evil&locale=zz' }));

    expect(searchParams.getAll('product')).toEqual(['tray']);
    expect(searchParams.getAll('locale')).toEqual(['de']);
  });

  it('keeps the query string of the endpoint itself', () => {
    const url = new URL(buildBakeUrl({ ...request, bakeUrl: 'https://bake.test/api/ar/bake?stage=dev' }));

    expect(url.host).toBe('bake.test');
    expect(url.searchParams.get('stage')).toBe('dev');
  });
});

describe('requestArBake', () => {
  it('posts the model and resolves the USDZ against the endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(200, { cacheKey: 'k', usdz: '/ar/k.usdz' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestArBake(request)).resolves.toEqual({
      cacheKey: 'k',
      cached: false,
      usdz: 'https://x.test/ar/k.usdz',
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://x.test/api/ar/bake?product=tray&locale=de');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('retries once when the service rejects the call', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond(500, { error: 'ResourceNotReadyException' }))
      .mockResolvedValueOnce(respond(200, { usdz: '/u.usdz' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestArBake(request)).resolves.toMatchObject({ usdz: 'https://x.test/u.usdz' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a gateway error that carries no JSON', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond(502, '<html>Bad Gateway</html>'))
      .mockResolvedValueOnce(respond(200, { usdz: '/u.usdz' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestArBake(request)).resolves.toMatchObject({ usdz: 'https://x.test/u.usdz' });
  });

  it('gives up after the retry rather than looping', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(500, { error: 'still down' }));
    vi.stubGlobal('fetch', fetchMock);

    const error = await failure(requestArBake(request));

    expect(error).toMatchObject({ message: 'still down', reason: 'unavailable', status: 500 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a rejected model, which would fail identically', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(400, { error: 'Unknown product "nope"' }));
    vi.stubGlobal('fetch', fetchMock);

    const error = await failure(requestArBake(request));

    expect(error).toMatchObject({ message: 'Unknown product "nope"', reason: 'rejected', status: 400 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects an answer without a USDZ and one pointing off the web', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(200, { cacheKey: 'k' })));
    expect((await failure(requestArBake(request))).reason).toBe('invalid-response');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(200, { usdz: SCRIPT_URL })));
    expect((await failure(requestArBake(request))).reason).toBe('invalid-response');
  });

  it('reports an unreachable service as a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    expect((await failure(requestArBake(request))).reason).toBe('network');
  });

  const hangingFetch = () =>
    vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );

  it('aborts an attempt that outlasts the timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', hangingFetch());

    const pending = failure(requestArBake({ ...request, timeoutMs: 1000 }));
    await vi.advanceTimersByTimeAsync(1000);

    expect((await pending).reason).toBe('timeout');
  });

  it('stops when the caller cancels', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const controller = new AbortController();

    const pending = failure(requestArBake({ ...request, signal: controller.signal }));
    controller.abort();

    expect((await pending).reason).toBe('aborted');
  });
});
