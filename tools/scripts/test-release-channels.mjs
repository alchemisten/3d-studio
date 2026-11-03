import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const releaseRoot = dirname(require.resolve('semantic-release'));
const releaseRequire = createRequire(join(releaseRoot, 'package.json'));
const { default: nextVersion } = await import(pathToFileURL(join(releaseRoot, 'lib/get-next-version.js')).href);
const { release, prerelease } = await import(pathToFileURL(join(releaseRoot, 'lib/branches/normalize.js')).href);
const { analyzeCommits } = await import(
  pathToFileURL(releaseRequire.resolve('@semantic-release/commit-analyzer')).href
);
const config = JSON.parse(readFileSync('.releaserc', 'utf8'));
assert.deepEqual(config.branches, ['main', { name: 'develop', prerelease: 'rc', channel: 'next' }]);
const stable = release({ release: [{ name: 'main', tags: [{ version: '0.3.0' }] }] })[0];
const candidate = prerelease({ prerelease: [{ ...config.branches[1], tags: [{ version: '0.3.0' }] }] })[0];
const logger = { log: () => undefined };
const type = await analyzeCommits(
  {},
  {
    cwd: process.cwd(),
    logger,
    commits: [
      { hash: 'fixture', message: 'feat: rebuild viewer\n\nBREAKING CHANGE: replace the previous viewer API.' },
    ],
  },
);
assert.equal(type, 'major');
const version = (branch, lastRelease, releaseType) =>
  nextVersion({ branch, lastRelease, nextRelease: { type: releaseType, channel: branch.channel }, logger });
assert.equal(version(candidate, { version: '0.3.0', channels: [null] }, type), '1.0.0-rc.1');
assert.equal(
  version(
    { ...candidate, tags: [{ version: '0.3.0' }, { version: '1.0.0-rc.1' }] },
    { version: '1.0.0-rc.1', channels: ['next'] },
    'patch',
  ),
  '1.0.0-rc.2',
);
assert.equal(version(stable, { version: '0.3.0', channels: [null] }, type), '1.0.0');
assert.equal(version(candidate, { version: '1.0.0', channels: [null] }, 'minor'), '1.1.0-rc.1');
const backmerge = config.plugins.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === '@saithodev/semantic-release-backmerge',
)[1];
assert.deepEqual(backmerge.backmergeBranches, [{ from: 'main', to: 'develop' }]);
assert.equal(backmerge.backmergeStrategy, 'merge');
const backmergeRoot = dirname(require.resolve('@saithodev/semantic-release-backmerge'));
const { performBackmerge } = await import(pathToFileURL(join(backmergeRoot, 'perform-backmerge.js')).href);
const gitCalls = [];
const git = new Proxy(
  {},
  {
    get: (_, operation) => async () => {
      gitCalls.push(operation);
      assert.ok(
        ['configFetchAllRemotes', 'fetch'].includes(operation),
        `Unexpected develop mutation: ${String(operation)}`,
      );
    },
  },
);
await performBackmerge(git, backmerge, {
  branch: { name: 'develop' },
  options: { repositoryUrl: 'https://example.invalid/repository.git' },
  logger: {
    ...logger,
    error: (message) => {
      throw new Error(message);
    },
  },
});
assert.deepEqual(gitCalls, ['configFetchAllRemotes', 'fetch']);
const command = config.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === '@semantic-release/exec')[1]
  .publishCmd;
assert.ok(command.includes("--tag=${nextRelease.channel || 'latest'}"));
const pagesWorkflow = readFileSync('.github/workflows/pages.yml', 'utf8');
const expression = pagesWorkflow.match(/TARGETS: \$\{\{ (.+) \}\}/)?.[1];
assert.ok(expression, 'Pages target expression must be present');
const evaluateTargets = new Function('github', 'format', 'startsWith', 'contains', `return (${expression});`);
for (const [event, ref, expected] of [
  ['push', 'refs/heads/main', 'latest'],
  ['push', 'refs/heads/develop', 'next'],
  ['push', 'refs/tags/v1.0.0-rc.1', 'v1.0.0-rc.1 next'],
  ['push', 'refs/tags/v1.0.0', 'v1.0.0 latest'],
  ['pull_request', 'refs/pull/47/merge', 'pr/47'],
  ['workflow_dispatch', 'refs/heads/feature/example', ''],
]) {
  const result = evaluateTargets(
    {
      event_name: event,
      ref,
      ref_name: ref.replace(/^refs\/(heads|tags)\//, ''),
      event: { pull_request: { number: 47 } },
    },
    (template, ...values) => template.replace(/\{(\d+)\}/g, (_, index) => values[Number(index)]),
    (value, prefix) => value.startsWith(prefix),
    (value, part) => value.includes(part),
  );
  assert.equal(result, expected, ref);
}
console.log('Release channels passed: 1.0.0-rc.1, rc.2, stable 1.0.0, next cycle 1.1.0-rc.1. No publishing.');
