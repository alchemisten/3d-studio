import { BoxGeometry, Group, Mesh } from 'three';
import { expect, it } from 'vitest';
import { createPoseTracker } from './pose-tracker';

it('reuses a static pose and invalidates it after shadow caster changes', () => {
  const model = new Group();
  const mesh = new Mesh(new BoxGeometry());
  model.add(mesh);
  const changed = createPoseTracker();
  const changesOnce = () => {
    expect(changed(model)).toBe(true);
    expect(changed(model)).toBe(false);
  };
  changesOnce();
  model.position.y++;
  changesOnce();
  mesh.visible = false;
  changesOnce();
  mesh.material.visible = false;
  changesOnce();
  const positions = mesh.geometry.getAttribute('position');
  mesh.geometry.setAttribute('position', positions.clone());
  changesOnce();
  mesh.geometry.getAttribute('position').needsUpdate = true;
  changesOnce();
  mesh.geometry.setIndex(mesh.geometry.index!.clone());
  changesOnce();
  mesh.geometry.index!.needsUpdate = true;
  changesOnce();
});

it('invalidates when alternating previously seen meshes with identical poses', () => {
  const model = new Group();
  const first = new Mesh();
  const second = new Mesh();
  const changed = createPoseTracker();
  for (const mesh of [first, second, first]) {
    model.clear().add(mesh);
    expect(changed(model)).toBe(true);
    expect(changed(model)).toBe(false);
  }
});
