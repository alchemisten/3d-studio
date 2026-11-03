import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { delimiter, resolve } from 'node:path';

mkdirSync('dist', { recursive: true });
const root = mkdtempSync(resolve('dist/bootstrap-test-'));
const log = resolve(root, 'calls.log');
const bash =
  process.env.BOOTSTRAP_BASH ?? (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
writeFileSync(
  resolve(root, 'npm'),
  `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$BOOTSTRAP_TEST_LOG"
case "$1" in
  --version) echo 11.15.0 ;;
  whoami)
    if [[ "$BOOTSTRAP_TEST_CASE" == auth ]]; then echo E401 >&2; exit 1; fi
    echo fixture-account ;;
  view)
    if [[ "$BOOTSTRAP_TEST_CASE" == registry ]]; then echo E401 >&2; exit 1; fi
    if [[ "$BOOTSTRAP_TEST_CASE" == missing ]]; then echo E404 >&2; exit 1; fi
    echo 0.0.1 ;;
  publish)
    [[ ! -e registry-error ]] || exit 98
    cp package.json "$BOOTSTRAP_TEST_MANIFEST" ;;
  trust)
    for arg in "$@"; do
      if [[ "$arg" == --@schablone:registry=* ]]; then echo 'Unknown flag: --@schablone:registry' >&2; exit 1; fi
    done ;;
  *) echo "Unexpected npm invocation: $*" >&2; exit 99 ;;
esac
`,
  { mode: 0o755 },
);
const run = (scenario, args = []) => {
  writeFileSync(log, '');
  const result = spawnSync(bash, ['tools/scripts/bootstrap-npm.sh', ...args], {
    encoding: 'utf8',
    timeout: 120000,
    env: {
      ...process.env,
      PATH: root + delimiter + process.env.PATH,
      BOOTSTRAP_TEST_CASE: scenario,
      BOOTSTRAP_TEST_LOG: log.replaceAll('\\', '/'),
      BOOTSTRAP_TEST_MANIFEST: resolve(root, 'published-manifest.json').replaceAll('\\', '/'),
    },
  });
  assert.ifError(result.error);
  return { ...result, calls: existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean) : [] };
};
const dry = run('auth', ['--dry-run']);
assert.equal(dry.status, 0, dry.stderr);
assert.equal(dry.calls.length, 0);
assert.equal((dry.stdout.match(/create 0\.0\.1/g) ?? []).length, 14);
const invalid = run('auth', ['--unknown']);
assert.equal(invalid.status, 2);
assert.equal(invalid.calls.length, 0);
for (const scenario of ['auth', 'registry']) {
  const result = run(scenario);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.calls.filter((call) => /^(publish|trust|login)\b/.test(call)).length, 0);
}
for (const scenario of ['existing', 'missing']) {
  const result = run(scenario);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls.filter((call) => call.startsWith('publish ')).length, scenario === 'missing' ? 14 : 0);
  assert.equal(result.calls.filter((call) => call.startsWith('trust github ')).length, 14);
  for (const call of result.calls) {
    assert.ok(call.includes('--registry=https://registry.npmjs.org/'), call);
    assert.equal(call.includes('--@schablone:registry=https://registry.npmjs.org/'), !call.startsWith('trust '), call);
  }
  if (scenario === 'missing') {
    const manifest = JSON.parse(readFileSync(resolve(root, 'published-manifest.json'), 'utf8'));
    assert.deepEqual(manifest.files, ['package.json']);
    assert.equal(manifest.publishConfig.registry, 'https://registry.npmjs.org/');
  }
}
console.log(
  'Bootstrap checks passed: offline dry-run, authentication/registry failures, existing/missing packages. All npm calls mocked.',
);
