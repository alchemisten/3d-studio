import { readCachedProjectGraph } from '@nx/devkit';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { isAbsolute, relative, resolve } from 'path';
import { z } from 'zod';

const expectOrError: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
};

const [, , name, version, tag = 'latest'] = process.argv;

const validVersion =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;
expectOrError(
  version && validVersion.test(version),
  `No version provided or version did not match Semantic Versioning, expected: #.#.#-tag.# or #.#.#, got ${version}.`,
);
expectOrError(tag === 'latest' || tag === 'next', `Unsupported npm tag: ${tag}`);
const isPrerelease = version.split('+')[0].includes('-');
expectOrError(isPrerelease === (tag === 'next'), 'Prereleases require next; stable releases require latest.');

const graph = readCachedProjectGraph();
const project = Object.hasOwn(graph.nodes, name) ? graph.nodes[name] : undefined;
expectOrError(project, `Could not find project "${name}" in the workspace. Is the project.json configured correctly?`);

const projectRoot = project.data?.root ?? '';
const outDir = project.data?.targets?.build?.options?.outDir;
expectOrError(
  outDir,
  `Could not find "build.options.outDir" of project "${name}". Is project.json configured  correctly?`,
);

// Resolve to absolute path from repo root CWD
const absOutDir = isAbsolute(outDir)
  ? outDir
  : outDir.startsWith('../') || outDir.startsWith('./')
    ? resolve(process.cwd(), projectRoot, outDir)
    : resolve(process.cwd(), outDir);
const outputRelativePath = relative(resolve(process.cwd(), 'dist'), absOutDir);
expectOrError(
  outputRelativePath && !outputRelativePath.startsWith('..') && !isAbsolute(outputRelativePath),
  `Publish output must be inside the workspace dist directory: ${absOutDir}`,
);
process.chdir(absOutDir);

// Updating the version in "package.json" before publishing
try {
  const json = z
    .object({
      name: z.string().regex(/^@schablone\/3d-studio(?:-[a-z0-9-]+)?$/),
      private: z.literal(false).optional(),
    })
    .passthrough()
    .parse(JSON.parse(readFileSync('package.json', 'utf8')));
  json.version = version;
  json.publishConfig = {
    access: 'public',
    tag,
  };
  json.author = 'Alchemisten AG';
  json.bugs = {
    url: 'https://github.com/alchemisten/3d-studio/issues',
  };
  json.repository = {
    type: 'git',
    url: 'https://github.com/alchemisten/3d-studio.git',
    directory: projectRoot.replaceAll('\\', '/'),
  };
  json.homepage = `https://github.com/alchemisten/3d-studio/tree/v${version}/${projectRoot.replaceAll('\\', '/')}`;

  const serializedJson = JSON.stringify(json, null, '\t').replace(/__root_version__/g, version);

  writeFileSync(`package.json`, serializedJson);
} catch (e) {
  throw new Error('Cannot prepare package manifest; publishing aborted.', { cause: e });
}

// Publish
execSync(`npm publish --provenance --tag ${tag}`, { stdio: 'inherit', timeout: 300000 });
