import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { renderScene } from './index';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: scene-preview scene.json thumbnail.png');
const scene = JSON.parse(await readFile(input, 'utf8'));
await writeFile(
  output,
  await renderScene(scene, { baseDir: dirname(resolve(input)), channel: process.env.SCENE_BROWSER_CHANNEL }),
);
