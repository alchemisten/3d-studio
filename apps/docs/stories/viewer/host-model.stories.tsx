import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo } from 'react';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { PreviewLights, Viewer, ViewerStore } from '@schablone/3d-studio-core';
import { Button } from '@schablone/3d-studio-ui';
import { floor } from '@schablone/3d-studio-feature-floor';
import { highlights } from '@schablone/3d-studio-feature-highlights';
import { wireframe } from '@schablone/3d-studio-feature-wireframe';
import { Example } from '../shared/story-scene';

const crate = (level: number) => {
  const mesh = new Mesh(
    new BoxGeometry(0.6, 0.3, 0.4),
    new MeshStandardMaterial({ color: level ? '#6f8f72' : '#3d6fb4' }),
  );
  mesh.name = level ? `Crate ${level}` : 'Crate';
  mesh.position.y = 0.15 + level * 0.3;
  return mesh;
};

const features = [
  floor,
  wireframe,
  highlights.use({
    highlights: [{ id: 'crate', label: 'Bottom crate', anchor: { node: 'Crate', offset: [0.3, 0.15, 0.2] } }],
  }),
];

const Stack = () => {
  const store = useMemo(() => new ViewerStore(), []);
  const model = useMemo(() => {
    const scene = new Group();
    scene.add(crate(0));
    return { scene };
  }, []);
  const stack = () => {
    model.scene.add(crate(model.scene.children.length));
    store.notifyModelChanged({ fit: true });
  };
  return (
    <Example
      title="A model the host owns"
      hint="The scene is built by the page, not loaded. Stacking a crate changes it in place and tells the viewer, which fits the floor, its shadow and the camera again."
    >
      <div className="studio-example__retry">
        <Button onClick={stack}>Stack a crate</Button>
        <Viewer model={model} store={store} features={features} canvasChildren={<PreviewLights />} />
      </div>
    </Example>
  );
};

export default { title: 'Viewer/Host model' } satisfies Meta;
export const HostOwnedModel: StoryObj = { render: () => <Stack /> };
