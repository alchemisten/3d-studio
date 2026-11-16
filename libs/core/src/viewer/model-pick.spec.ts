import { describe, expect, it } from 'vitest';
import { BoxGeometry, Mesh, Raycaster, Vector3 } from 'three';
import { pickFromIntersection } from './model-pick';

describe('pickFromIntersection', () => {
  it('reports the world-space point and normal of a hit on a rotated mesh', () => {
    const mesh = new Mesh(new BoxGeometry(1, 1, 1));
    mesh.rotation.z = Math.PI / 2;
    mesh.updateMatrixWorld(true);
    const raycaster = new Raycaster(new Vector3(0, 5, 0), new Vector3(0, -1, 0));
    const [hit] = raycaster.intersectObject(mesh);

    const pick = pickFromIntersection(hit, true);

    expect(pick.object).toBe(mesh);
    expect(pick.additive).toBe(true);
    expect(pick.point[1]).toBeCloseTo(0.5);
    expect(pick.normal[0]).toBeCloseTo(0);
    expect(pick.normal[1]).toBeCloseTo(1);
    expect(pick.normal[2]).toBeCloseTo(0);
  });

  it('points up when the hit has no face', () => {
    const mesh = new Mesh(new BoxGeometry(1, 1, 1));
    const pick = pickFromIntersection({ distance: 1, point: new Vector3(1, 2, 3), object: mesh });
    expect(pick.point).toEqual([1, 2, 3]);
    expect(pick.normal).toEqual([0, 1, 0]);
  });
});
