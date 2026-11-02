import { expect, it } from 'vitest';
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
