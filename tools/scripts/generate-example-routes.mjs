import { resolve } from 'node:path';
import { Generator, getConfig } from '@tanstack/router-generator';

const root = resolve('apps/example-tanstack');
await new Generator({ root, config: getConfig({}, root) }).run();
