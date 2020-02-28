const path = require('path');
const fs = require('fs');
const { compileFromFile } = require('json-schema-to-typescript');
const { createDirIfNotExistent } = require('./utils');

const GLTF_2_SCHEMA_SPEC = path.resolve(__dirname, './glTF-spec/specification/2.0/schema/glTF.schema.json');

const outputPath = process.argv[2] || './out/';
const outputFileName = process.argv[3] || 'gltf.d.ts';
const schemaPath = process.argv[4] || GLTF_2_SCHEMA_SPEC;

compileFromFile(schemaPath).then(ts => {
    createDirIfNotExistent(outputPath);
    fs.writeFileSync(path.resolve(outputPath, outputFileName), ts);
});

/**
 * TODO Use higher version for json-schema-to-typescript
 *
 * The latest ts generator version won't work with the gltf specification 2.0 just out of the box.
 * To generate a better definition type file, update the version for json-schema-to-typescript
 *
 * Second argument only needed for json-schema-to-typescript version >= 4.0.0
 * compileFromFile(schemaPath, {cwd:  path.resolve(__dirname, './glTF-spec/specification/2.0/schema')}).then(ts => fs.writeFileSync( outputPath, ts));
  */
