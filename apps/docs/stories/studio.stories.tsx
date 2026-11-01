import type { Meta, StoryObj } from '@storybook/react';
import { createStaticAdapter } from '@schablone/3d-studio-core';
import { ProjectList, Studio } from '@schablone/3d-studio';
import { Badge, Button } from '@schablone/3d-studio-ui';
import { Heart } from 'lucide-react';

const adapter = createStaticAdapter([
  {
    id: 'spinning-box',
    name: 'Spinning box',
    description: 'Animated demo model with highlights.',
    source: './models/spinning-box/spinning-box.gltf',
    featureConfig: {
      highlights: {
        highlights: [
          { id: 'corner', label: 'Corner', anchor: { node: 'Box', offset: [0.5, 0.5, 0.5] }, camera: { position: [1.6, 1.2, 1.6] } },
        ],
      },
    },
  },
  { id: 'second', name: 'Second project', source: './models/spinning-box/spinning-box.gltf' },
]);

const meta: Meta<typeof Studio> = {
  title: 'Studio/Studio',
  component: Studio,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div style={{ height: '100vh' }}><Story /></div>],
};
export default meta;

export const ListAndDetail: StoryObj<typeof Studio> = {
  args: {
    adapter,
    viewer: { draco: './draco/', canvasChildren: <ambientLight intensity={2} /> },
    slots: { 'project-list.header': <h1>Projects</h1> },
  },
};

const thumb = (a: string, b: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='640' height='400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='640' height='400' fill='url(#g)'/></svg>`)}`;

const richAdapter = createStaticAdapter([
  { id: '1', name: 'Spinning box', description: 'Animated demo model with a node-attached highlight and a very long description that should be clamped to two lines.', thumbnail: thumb('#7dd3fc', '#a78bfa'), tags: ['Animated', 'Demo'], source: '' },
  { id: '2', name: 'Chair', description: 'Static product shot.', thumbnail: thumb('#fde68a', '#f9a8d4'), tags: ['Product'], source: '' },
  { id: '3', name: 'No thumbnail', description: 'Falls back to a placeholder.', tags: ['Draft'], source: '' },
  { id: '4', name: 'Engine', description: 'Exploded view with highlights.', thumbnail: thumb('#86efac', '#38bdf8'), tags: ['Highlights', 'Animated'], source: '' },
  { id: '5', name: 'Lamp', thumbnail: thumb('#fca5a5', '#fcd34d'), source: '' },
  { id: '6', name: 'Bike', description: 'Configurator with variants.', thumbnail: thumb('#c4b5fd', '#f0abfc'), tags: ['Variants'], source: '' },
]);

export const RichProjectList: StoryObj<typeof ProjectList> = {
  render: () => (
    <ProjectList
      adapter={richAdapter}
      getHref={() => '#'}
      slots={{
        'project-list.header': <h1 style={{ margin: 0 }}>Projects</h1>,
        'project-list.toolbar': <Button variant="ghost">Sort: Newest</Button>,
        'project-list.card.media.overlay': ({ project }) => (project.id === '1' ? <Badge tone="accent">New</Badge> : null),
        'project-list.card.footer': () => (
          <Button variant="ghost" icon={<Heart size={16} />}>
            Favorite
          </Button>
        ),
      }}
    />
  ),
};
