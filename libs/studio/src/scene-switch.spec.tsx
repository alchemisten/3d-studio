import { act, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Studio } from './studio';

vi.mock('@schablone/3d-studio-core', async importOriginal => ({
  ...await importOriginal<typeof import('@schablone/3d-studio-core')>(),
  Viewer: ({ source }: { source: string }) => <output>{source}</output>,
}));

it('hides the previous model while a controlled scene change is pending', async () => {
  const alpha = { id: 'a', name: 'Alpha', source: 'a.glb' };
  const beta = { id: 'b', name: 'Beta', source: 'b.glb' };
  let finish!: (project: typeof beta) => void;
  const pending = new Promise<typeof beta>(resolve => { finish = resolve; });
  const adapter = { listProjects: async () => [alpha, beta], getProject: async (id: string) => id === 'a' ? alpha : pending };
  const { rerender } = render(<Studio projectId="a" adapter={adapter} />);
  await screen.findByText('a.glb');
  rerender(<Studio projectId="b" adapter={adapter} />);
  expect(screen.queryByText('a.glb')).toBeNull();
  await act(async () => finish(beta));
  await screen.findByText('b.glb');
});
