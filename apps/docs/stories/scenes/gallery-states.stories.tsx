import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProjectList } from '@schablone/3d-studio';
import { createStaticAdapter, type ProjectAdapter } from '@schablone/3d-studio-core';
import { Example } from '../shared/story-scene';

export default { title: 'Studio/Gallery states' } satisfies Meta;
const empty = createStaticAdapter([]);
const unavailable: ProjectAdapter = {
  ...empty,
  listProjects: async () => {
    throw new Error('Scene catalog unavailable.');
  },
};
export const EmptyCatalog: StoryObj = {
  render: () => (
    <Example title="Empty gallery" hint="An empty adapter result renders the gallery’s empty slot.">
      <ProjectList adapter={empty} />
    </Example>
  ),
};
export const FailedCatalog: StoryObj = {
  render: () => (
    <Example title="Catalog error" hint="An adapter failure renders an alert instead of an empty gallery.">
      <ProjectList adapter={unavailable} />
    </Example>
  ),
};
