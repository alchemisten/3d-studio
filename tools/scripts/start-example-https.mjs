import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const { STUDIO_TLS_CERT, STUDIO_TLS_KEY } = process.env;
if (!STUDIO_TLS_CERT || !STUDIO_TLS_KEY) {
  throw new Error('Set STUDIO_TLS_CERT and STUDIO_TLS_KEY to the certificate and private key paths.');
}
const server = await createServer({
  configFile: 'apps/example/vite.config.ts',
  cacheDir: '../../node_modules/.vite/example-https',
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: true,
    https: { cert: await readFile(STUDIO_TLS_CERT), key: await readFile(STUDIO_TLS_KEY) },
  },
});
await server.listen();
server.printUrls();
