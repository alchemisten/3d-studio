import { BoxGeometry, type BufferGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const LENGTH = 0.6;
const WIDTH = 0.4;
const HEIGHT = 0.16;
const WALL = 0.012;
const RIB = 0.006;

const box = (width: number, height: number, depth: number, x: number, y: number, z: number): BufferGeometry =>
  new BoxGeometry(width, height, depth).translate(x, y, z);

/** A plastic tray with stiffening ribs, pockets and bosses: the kind of part ambient occlusion reads best on. */
const createRibbedTray = (): Group => {
  const shell = new MeshStandardMaterial({ color: '#c9d2d8', roughness: 0.62, metalness: 0 });
  const accent = new MeshStandardMaterial({ color: '#2f6f9f', roughness: 0.5, metalness: 0 });
  const tray = new Group();
  tray.name = 'RibbedTray';
  const add = (name: string, geometry: BufferGeometry, material = shell) => {
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    tray.add(mesh);
  };

  add('Base', box(LENGTH, WALL, WIDTH, 0, WALL / 2, 0));
  add('WallFront', box(LENGTH, HEIGHT, WALL, 0, HEIGHT / 2, WIDTH / 2 - WALL / 2));
  add('WallBack', box(LENGTH, HEIGHT, WALL, 0, HEIGHT / 2, -WIDTH / 2 + WALL / 2));
  add('WallLeft', box(WALL, HEIGHT, WIDTH, -LENGTH / 2 + WALL / 2, HEIGHT / 2, 0));
  add('WallRight', box(WALL, HEIGHT, WIDTH, LENGTH / 2 - WALL / 2, HEIGHT / 2, 0));

  const ribHeight = HEIGHT * 0.55;
  for (let index = 1; index <= 5; index += 1) {
    const x = -LENGTH / 2 + (LENGTH / 6) * index;
    add(`RibAcross${index}`, box(RIB, ribHeight, WIDTH - WALL * 2, x, WALL + ribHeight / 2, 0));
  }
  for (let index = 1; index <= 2; index += 1) {
    const z = -WIDTH / 2 + (WIDTH / 3) * index;
    add(`RibAlong${index}`, box(LENGTH - WALL * 2, ribHeight, RIB, 0, WALL + ribHeight / 2, z));
  }

  const outerRibs = 9;
  for (let index = 0; index < outerRibs; index += 1) {
    const x = -LENGTH / 2 + 0.04 + ((LENGTH - 0.08) / (outerRibs - 1)) * index;
    for (const side of [-1, 1]) {
      add(
        `Gusset${index}${side > 0 ? 'Front' : 'Back'}`,
        box(RIB, HEIGHT * 0.7, 0.018, x, HEIGHT * 0.55, side * (WIDTH / 2 + 0.009)),
      );
    }
  }
  const lip = 0.02;
  const rimY = HEIGHT - 0.005;
  add('RimFront', box(LENGTH + lip * 2, 0.01, lip, 0, rimY, WIDTH / 2 + lip / 2));
  add('RimBack', box(LENGTH + lip * 2, 0.01, lip, 0, rimY, -WIDTH / 2 - lip / 2));
  add('RimLeft', box(lip, 0.01, WIDTH, -LENGTH / 2 - lip / 2, rimY, 0));
  add('RimRight', box(lip, 0.01, WIDTH, LENGTH / 2 + lip / 2, rimY, 0));

  for (const [x, z] of [
    [-0.25, -0.15],
    [0.25, -0.15],
    [-0.25, 0.15],
    [0.25, 0.15],
  ]) {
    add(`Boss${x}${z}`, new CylinderGeometry(0.016, 0.02, 0.05, 32).translate(x, WALL + 0.025, z), accent);
  }
  return tray;
};

/** Builds the tray and returns it as an object URL of a binary glTF. Revoke the URL when it is no longer shown. */
export const createRibbedTrayUrl = async (): Promise<string> => {
  const glb = await new GLTFExporter().parseAsync(createRibbedTray(), { binary: true });
  if (!(glb instanceof ArrayBuffer)) throw new Error('The glTF exporter did not return a binary file.');
  return URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' }));
};
