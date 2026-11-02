import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dir = process.argv[2];
const html = await readFile(join(dir, 'index.html'), 'utf8');
if (!html.includes('<base href="/"')) throw new Error('Expected an app base in the Vite entry');
const ids = Object.values(
  JSON.parse(await readFile(new URL('../../apps/samples/scene-ids.json', import.meta.url), 'utf8')),
);
for (const route of [[], ['scenes'], ...ids.map((id) => ['scenes', id])]) {
  const destination = join(dir, ...route);
  const base = '../'.repeat(route.length) || './';
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, 'index.html'), html.replace('<base href="/"', '<base href="' + base + '"'));
}
