import { compileFromFile, Options } from 'json-schema-to-typescript';
import * as path from 'path';
import * as fs from 'fs';
import { rimraf } from 'rimraf';
import { EXTENSION_NAME } from '../src';
import { LoggerFactory } from '@schablone/logging';

const logger = LoggerFactory({
  environment: 'develop',
});

const gltfSpecRoot = path.resolve(__dirname, '../glTF-spec/');
const specificationRoot = path.resolve(gltfSpecRoot, 'specification/2.0/schema');
const extensionRoot = path.resolve(gltfSpecRoot, `extensions/2.0/Vendor/${EXTENSION_NAME}/schema`);
const generatedRoot = path.resolve(__dirname, '../src/generated');

if (fs.existsSync(generatedRoot)) {
  rimraf.sync(generatedRoot);
}
fs.mkdirSync(generatedRoot);

const run = async () => {
  const options: Partial<Options> = {
    format: true,
    enableConstEnums: true,
    $refOptions: {
      resolve: {
        file: {
          read(file) {
            return fs.readFileSync(path.resolve(specificationRoot, path.basename(file.url)), { encoding: 'utf8' });
          },
        },
      },
    },
  };

  const index: string[] = [];

  for (const file of fs.readdirSync(extensionRoot)) {
    if (file.endsWith('.schema.json')) {
      logger.info(`Generating TS for Schema "${file}"`);
      const schemaPath = path.resolve(extensionRoot, file);
      const generatedTypescript = await compileFromFile(schemaPath, options);
      const typescriptOutputFileName = file.replace('.schema.json', '.ts');
      fs.writeFileSync(path.resolve(generatedRoot, typescriptOutputFileName), generatedTypescript, {
        encoding: 'utf-8',
      });
      index.push(typescriptOutputFileName);
    }
  }

  logger.info('Generating index.ts');
  fs.writeFileSync(
    path.resolve(generatedRoot, 'index.ts'),
    index.map((file) => `export * from './${file.replace('.ts', '')}';`).join('\n') + '\n',
    { encoding: 'utf-8' }
  );
};

run().then();
