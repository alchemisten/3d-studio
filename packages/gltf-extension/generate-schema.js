const fs = require('fs');
const path = require('path');


// LINKS https://github.com/YousefED/typescript-json-schema/blob/master/test/programs/extra-properties/schema.json

// schema generator
const {PartialArgs, CompilerOptions, exec, getDefaultArgs, getProgramFromFiles, generateSchema, buildGenerator} = require('typescript-json-schema');

// optionally pass argument to schema generator
const settings = {
    required: true
};

// optionally pass ts compiler options
const compilerOptions = {
    ref: true,
    aliasRef: false,
    topRef: false,
    titles: false,
    defaultProps: false,
    noExtraProps: false,
    propOrder: false,
    typeOfKeyword: false,
    required: false,
    strictNullChecks: false,
    ignoreErrors: false,
    out: "./out/glTF.ALCM_interactivity.schema.json",
    validationKeywords: [],
    include: [],
    excludePrivate: false,
    uniqueNames: false,
    rejectDateType: false,
    id: "",
    defaultNumberType: "number"
};

// optionally pass a base path
const basePath = "./src/extension/alcm";
const files = fs.readdirSync(basePath).filter(fn => fn.endsWith('.ts')).map(f=>path.resolve(basePath, f));
const program = getProgramFromFiles(files, compilerOptions, basePath);

// We can either get the schema for one file and one type...
const schema = generateSchema(program, "*", settings);
console.log(schema);

exec(`${basePath}/**/*.ts", "*"`, compilerOptions);