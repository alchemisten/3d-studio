import { resolveFeatureConfig, ViewerStore } from '@schablone/3d-studio-core';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import { expect, it } from 'vitest';
import { colorSwitcher } from './index';

it('tints only named paints and restores each original on selection and teardown', () => {
  const body = new MeshStandardMaterial({ name: 'Paint', color: '#123456' });
  const trim = new MeshStandardMaterial({ name: 'Paint', color: '#654321' });
  const glass = new MeshStandardMaterial({ name: 'Glass', color: '#abcdef' });
  const scene = new Group().add(new Mesh(undefined, [body, glass]), new Mesh(undefined, trim));
  const colors = () => [body, trim, glass].map(material => material.color.getHexString());
  const originals = colors();
  const viewer = new ViewerStore();
  viewer.setState({ gltf: { scene } as never });
  const config = resolveFeatureConfig({
    feature: colorSwitcher,
    props: { materials: ['Paint'], colors: [{ id: 'red', label: 'Red', color: '#ff0000' }] },
  });
  const cleanup = colorSwitcher.setup?.({ id: colorSwitcher.id, config, viewer, overlay: {} as never });
  viewer.setFeatureState(colorSwitcher.id, 'red');
  expect(colors()).toEqual(['ff0000', 'ff0000', 'abcdef']);
  viewer.setFeatureState(colorSwitcher.id, 'original');
  expect(colors()).toEqual(originals);
  viewer.setFeatureState(colorSwitcher.id, 'red');
  cleanup?.();
  expect(colors()).toEqual(originals);
});
