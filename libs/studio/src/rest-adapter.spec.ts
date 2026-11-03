import { expect, it, vi } from 'vitest';
import { createRestAdapter } from './rest-adapter';

const from = (payload: unknown) => ({ baseUrl: '/api', fetch: async () => Response.json(payload) });
it('rejects unrecognized envelopes and invalid project records', async () => {
  await expect(createRestAdapter(from({ items: [] })).listProjects()).rejects.toThrow();
  await expect(createRestAdapter(from([{ name: 'Missing source' }])).listProjects()).rejects.toThrow();
  await expect(createRestAdapter(from({ id: 1, name: 'Invalid', source: 'a' })).getProject('1')).rejects.toThrow();
});
it('supports custom list envelopes and validates the mapped records', async () => {
  const adapter = createRestAdapter({
    ...from({ items: ['box'] }),
    mapList: (raw) => (raw as { items: string[] }).items,
    mapProject: (raw) => ({ id: String(raw), name: String(raw), source: 'box.gltf' }),
  });
  expect(await adapter.listProjects()).toEqual([{ id: 'box', name: 'box', source: 'box.gltf' }]);
});

it('preserves arbitrary feature configuration and metadata values', async () => {
  const values = { nested: { enabled: true }, count: 2, empty: null, labels: ['a', 'b'] };
  const project = { id: 'box', name: 'Box', source: 'box.glb', featureConfig: values, meta: values };
  expect(await createRestAdapter(from(project)).getProject('box')).toEqual(project);
  expect(await createRestAdapter(from([project])).listProjects()).toEqual([project]);
});

it('encodes detail IDs and forwards JSON headers and cancellation', async () => {
  const controller = new AbortController();
  const request = vi.fn<typeof fetch>(async () => Response.json({ id: 'a/b', name: 'Box', source: 'box.glb' }));
  const adapter = createRestAdapter({ baseUrl: '/api/', fetch: request });
  await adapter.getProject('a/b', { signal: controller.signal });
  expect(request).toHaveBeenCalledWith('/api/projects/a%2Fb', {
    headers: { Accept: 'application/json' },
    signal: expect.any(AbortSignal),
  });
  const signal = request.mock.calls[0][1]?.signal;
  controller.abort();
  expect(signal?.aborted).toBe(true);
});

it('returns missing details but rejects missing lists and server errors', async () => {
  const missing = createRestAdapter({ baseUrl: '/api', fetch: async () => new Response(null, { status: 404 }) });
  expect(await missing.getProject('missing')).toBeUndefined();
  await expect(missing.listProjects()).rejects.toThrow('404');
  const unavailable = createRestAdapter({ baseUrl: '/api', fetch: async () => new Response(null, { status: 503 }) });
  await expect(unavailable.getProject('box')).rejects.toThrow('503');
  await expect(unavailable.listProjects()).rejects.toThrow('503');
});

it('combines the request deadline with caller cancellation', async () => {
  const deadline = new AbortController();
  const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal);
  try {
    const request = vi.fn<typeof fetch>(async () => Response.json([]));
    await createRestAdapter({ baseUrl: '/api', fetch: request }).listProjects({ signal: new AbortController().signal });
    expect(timeout).toHaveBeenCalledWith(30000);
    const signal = request.mock.calls[0][1]?.signal;
    deadline.abort();
    expect(signal?.aborted).toBe(true);
  } finally {
    timeout.mockRestore();
  }
});
