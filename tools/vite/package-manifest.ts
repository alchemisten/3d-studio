import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

export const packageManifest = (root: string): Plugin => ({
  name: 'studio-package-manifest',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'package.json',
      source: readFileSync(resolve(root, 'package.json'), 'utf8'),
    });
    for (const fileName of ['README.md', 'LICENSE.md']) {
      const local = resolve(root, fileName);
      this.emitFile({
        type: 'asset',
        fileName,
        source: readFileSync(existsSync(local) ? local : resolve(root, '../..', fileName), 'utf8'),
      });
    }
  },
});
