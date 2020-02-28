const fs = require('fs');
const path = require('path');


// LINKS https://github.com/YousefED/typescript-json-schema/blob/master/test/programs/extra-properties/schema.json

// schema generator
const {PartialArgs, CompilerOptions, getProgramFromFiles, generateSchema, buildGenerator} = require('typescript-json-schema');

// optionally pass argument to schema generator
const settings = {
    required: true
};

// optionally pass ts compiler options
const compilerOptions = {
    strictNullChecks: true
};

// optionally pass a base path
const basePath = "./src";
const files = fs.readdirSync(basePath).filter(fn => fn.endsWith('.ts')).map(f=>path.resolve(basePath, f));
const program = getProgramFromFiles(files, compilerOptions, basePath);

// We can either get the schema for one file and one type...
const schemaMo = generateSchema(program, "MaterialOption", settings);
const schemaM = generateSchema(program, "MaterialExtension", settings);
console.log(schemaMo);
console.log(schemaM);

// ... or a generator that lets us incrementally get more schemas
//const generator = buildGenerator(program, settings);
// all symbols
//const symbols = generator.getUserSymbols();

// Get symbols for different types from generator.
//const matSchema = generator.getSchemaForSymbol("Material");