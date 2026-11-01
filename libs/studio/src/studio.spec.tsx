import { createStaticAdapter } from '@schablone/3d-studio-core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectList, Studio, createRestAdapter, defaultFeatures } from './index';

const projects = [
  { id: 'a', name: 'Alpha', source: 'a.glb', description: 'First' },
  { id: 'b', name: 'Beta', source: 'b.glb' },
];

describe('ProjectList', () => {
  it('renders a card per project and reports selection', async () => {
    const onSelect = vi.fn();
    render(<ProjectList adapter={createStaticAdapter(projects)} onSelect={onSelect} />);
    fireEvent.click(await screen.findByTestId('ds-project-card-b').then((el) => el.querySelector('button') as HTMLElement));
    expect(onSelect).toHaveBeenCalledWith(projects[1]);
  });

  it('renders links when getHref is given and fills the empty slot', async () => {
    const { unmount } = render(<ProjectList adapter={createStaticAdapter(projects)} getHref={(p) => `/p/${p.id}`} />);
    const link = (await screen.findByTestId('ds-project-card-a')).querySelector('a');
    expect(link?.getAttribute('href')).toBe('/p/a');
    unmount();
    render(<ProjectList adapter={createStaticAdapter([])} slots={{ 'project-list.empty': 'Nothing here' }} />);
    await waitFor(() => expect(screen.getByText('Nothing here')).toBeTruthy());
  });

  it('shows adapter errors', async () => {
    const adapter = { listProjects: () => Promise.reject(new Error('boom')), getProject: async () => undefined };
    render(<ProjectList adapter={adapter} />);
    expect((await screen.findByTestId('ds-project-list-error')).textContent).toBe('boom');
  });
});

describe('Studio', () => {
  it('renders the list first', async () => {
    render(<Studio adapter={createStaticAdapter(projects)} />);
    expect(await screen.findByTestId('ds-project-card-a')).toBeTruthy();
  });
});

describe('createRestAdapter', () => {
  it('maps list and detail requests and treats 404 as missing', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith('/projects') ? Response.json({ projects }) : url.endsWith('/projects/a') ? Response.json(projects[0]) : new Response(null, { status: 404 }),
    );
    const adapter = createRestAdapter({ baseUrl: 'https://x.test/', fetch: fetchMock as unknown as typeof fetch });
    expect(await adapter.listProjects()).toHaveLength(2);
    expect((await adapter.getProject('a'))?.name).toBe('Alpha');
    expect(await adapter.getProject('zzz')).toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe('https://x.test/projects');
  });
});

describe('defaultFeatures', () => {
  it('bundles all six features', () => {
    expect(defaultFeatures).toHaveLength(6);
  });
});
