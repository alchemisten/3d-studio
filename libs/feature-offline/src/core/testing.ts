import type { FetchLike } from './with-timeout';

export interface FakeResponse {
  status?: number;
  body?: BodyInit | null;
  headers?: Record<string, string>;
}

export interface FakeFetch extends FetchLike {
  readonly calls: { url: string; init?: RequestInit }[];
}

/** A fetch answering from a URL table; unknown URLs fail like an unreachable network. */
export const createFakeFetch = (routes: Record<string, FakeResponse | (() => FakeResponse)>): FakeFetch => {
  const calls: FakeFetch['calls'] = [];
  const fakeFetch = async (input: string | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push({ url, init });
    const route = routes[url];
    if (!route) throw new TypeError(`Failed to fetch ${url}`);
    const { status = 200, body = 'content', headers } = typeof route === 'function' ? route() : route;
    return new Response(init?.method === 'HEAD' ? null : body, { status, headers });
  };
  return Object.assign(fakeFetch, { calls });
};

/** A minimal valid binary glTF container of `byteLength` bytes. */
export const createGlb = (byteLength = 20, declaredLength = byteLength): ArrayBuffer => {
  const bytes = new ArrayBuffer(byteLength);
  const header = new DataView(bytes);
  header.setUint32(0, 0x46546c67, true);
  header.setUint32(4, 2, true);
  header.setUint32(8, declaredLength, true);
  return bytes;
};
