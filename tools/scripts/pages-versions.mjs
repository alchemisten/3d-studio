import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
const dirs = (path) =>
  readdirSync(path).filter((name) => !name.startsWith('.') && statSync(join(path, name)).isDirectory());

const semver = (v) => v.replace(/^v/, '').split('.').map(Number);
const compare = (a, b) => {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (y[i] ?? 0) - (x[i] ?? 0);
  }
  return 0;
};

const top = dirs(root);
const versions = top.filter((name) => /^v\d/.test(name)).sort(compare);
const channels = ['latest', 'next'].filter((name) => top.includes(name));
const previews = top.includes('pr') ? dirs(join(root, 'pr')).map((n) => `pr/${n}`) : [];

writeFileSync(join(root, 'versions.json'), JSON.stringify({ channels, versions, previews, samples: [...channels, ...versions, ...previews].filter(entry => existsSync(join(root, entry, 'sample/index.html'))) }, null, 2));
