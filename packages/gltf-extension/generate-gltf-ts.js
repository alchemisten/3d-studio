const path = require('path');
const fs = require('fs');
const {
    compileFromFile
} = require('json-schema-to-typescript');
const {
    createDirIfNotExistent
} = require('./utils');

const OUT_BASE_PATH = "./out";

const GLTF_2_SCHEMA_SPEC = path.resolve(__dirname, './glTF-spec/specification/2.0/schema/glTF.schema.json');

const outputPath = process.argv[2] || OUT_BASE_PATH+'/gltf.d.ts';
const schemaPath = process.argv[3] || GLTF_2_SCHEMA_SPEC;

createDirIfNotExistent(OUT_BASE_PATH);
compileFromFile(schemaPath, {cwd:  path.resolve(__dirname, './glTF-spec/specification/2.0/schema')}).then(ts => fs.writeFileSync( outputPath, ts));

