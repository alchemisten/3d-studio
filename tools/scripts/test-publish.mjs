import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL('./publish.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const run = (options = {}) => {
  const events = [];
  const mocks = {
    '@nx/devkit': {
      readCachedProjectGraph: () => ({
        nodes: {
          core: {
            data: {
              root: 'libs/core',
              targets: { build: { options: { outDir: options.outDir ?? 'dist/libs/core' } } },
            },
          },
        },
      }),
    },
    fs: {
      readFileSync: () => options.manifest ?? '{"name":"@schablone/3d-studio-core"}',
      writeFileSync: (_, value) => {
        if (options.writeFails) throw new Error('Read-only');
        events.push(JSON.parse(value));
      },
    },
    child_process: { execSync: (command) => events.push(command) },
  };
  let error;
  try {
    runInNewContext(source, {
      exports: {},
      require: (name) => mocks[name] ?? require(name),
      console: { error: () => undefined },
      process: {
        argv: ['node', 'publish', options.name ?? 'core', options.version ?? '1.2.3', options.tag ?? 'latest'],
        cwd: () => process.cwd(),
        chdir: () => undefined,
        exit: () => {
          throw new Error('Exit');
        },
      },
    });
  } catch (cause) {
    error = cause;
  }
  return { events, error };
};

for (const options of [
  { manifest: '{' },
  { manifest: '{}' },
  { manifest: '{"name":"unrelated"}' },
  { manifest: '{"name":"@schablone/3d-studio-core","private":true}' },
  { writeFails: true },
  { version: '1.2.3;echo bad' },
  { version: '01.2.3' },
  { version: '1.2.3-01' },
  { name: 'toString' },
  { outDir: 'libs/core' },
  { outDir: 'dist/../libs/core' },
  { tag: 'next' },
  { tag: 'latest; echo bad' },
  { version: '1.0.0-rc.1', tag: 'latest' },
]) {
  const result = run(options);
  assert.ok(result.error, JSON.stringify(options));
  assert.equal(result.events.length, 0, JSON.stringify(options));
}
for (const version of ['1.2.3', '1.2.3-rc.1+build.4']) {
  const tag = version.includes('-') ? 'next' : 'latest';
  const result = run({ version, tag });
  assert.equal(result.error, undefined);
  assert.equal(result.events[0].version, version);
  assert.equal(result.events[0].repository.directory, 'libs/core');
  assert.equal(result.events[0].homepage, `https://github.com/alchemisten/3d-studio/tree/v${version}/libs/core`);
  assert.equal(result.events[0].publishConfig.tag, tag);
  assert.equal(result.events[1], `npm publish --provenance --tag ${tag}`);
}
process.stdout.write('Publish validation passed; npm publishing was mocked.\n');
