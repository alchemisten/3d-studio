import { readCachedProjectGraph } from '@nx/devkit';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const expectOrError = (condition: unknown, message: string): void => {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
};

// Default "tag" to "next" so we won't publish the "latest" tag by accident.
const [, , name, version] = process.argv;

// A simple SemVer validation to validate the version
const validVersion = /^\d+\.\d+\.\d+(-\w+\.\d+)?/;
expectOrError(
  version && validVersion.test(version),
  `No version provided or version did not match Semantic Versioning, expected: #.#.#-tag.# or #.#.#, got ${version}.`,
);

const graph = readCachedProjectGraph();
const project = graph.nodes[name];

expectOrError(project, `Could not find project "${name}" in the workspace. Is the project.json configured correctly?`);

const outDir = project.data?.targets?.build?.options?.outDir;
expectOrError(
  outDir,
  `Could not find "build.options.outDir" of project "${name}". Is project.json configured  correctly?`,
);

process.chdir(outDir);

// Updating the version in "package.json" before publishing
try {
  const json = JSON.parse(readFileSync(`package.json`).toString());
  // TODO get nice way of default values per package json
  json.version = version;
  json.publishConfig = {
    access: 'public',
  };
  json.author = 'Alchemisten AG';
  json.bugs = {
    url: 'https://github.com/alchemisten/3d-studio/issues',
  };
  json.repository = {
    type: 'git',
    url: 'https://github.com/alchemisten/3d-studio.git',
  };
  json.homepage = `https://github.com/alchemisten/3d-studio/tree/v${version}/${outDir.replace(/^dist\//, '')}`;

  const serializedJson = JSON.stringify(json, null, '\t').replace(/__root_version__/g, version);

  writeFileSync(`package.json`, serializedJson);
} catch (e) {
  console.error(`Error reading package.json file from library build output.`);
}

// Execute "npm publish" to publish
execSync(`npm publish`);
