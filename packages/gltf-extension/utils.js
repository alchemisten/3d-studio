const fs = require('fs');
const path = require('path');

const SCHEMA_ROOT = path.resolve(__dirname, './glTF-spec/extensions/2.0/Vendor/ALCM_interactivity/schema');

const defaultEnhancement = {
    $schema: 'http://json-schema.org/draft-04/schema',
    title: 'ALCM_interactivity',
    type: 'object',
};

/**
 * outputs the schema with formatting with the specified filename
 * @param {*} name filename
 * @param {*} schema schema description
 */
function outputSchemaFile(name, schema) {
    // reformat the allOf statement

    let jsonStr;
    if(schema.allOf) {
        const refsString = JSON.stringify(schema.allOf)
        .replace(/([\[\{:,])/g, '$1 ')
        .replace(/([\]\}])/g, ' $1');

        // substitute the allOf statement to match the format of the other documents
        jsonStr = JSON.stringify({...schema, allOf: '__ALL_OF__'}, null, '\t')
                .replace(/"__ALL_OF__"/, refsString);
    } else {
        jsonStr = JSON.stringify(schema, null, '\t');
    }
    

    fs.writeFileSync(path.resolve(SCHEMA_ROOT, name), jsonStr);
}

/**
 * adds extra props
 * @param schema
 * @param extra 
 */
function enhanceSchema(extra = defaultEnhancement, schema) {
    return {
        ...defaultEnhancement,
        ...extra,
        ...schema,
    };
}

/**
 * 
 * @param {*} ref 
 */
function fixReference(ref) {
    return createTypeName(ref.$ref.replace('#/definitions/', ''));
}

/**
 * generates type filename
 * @param typeName
 */
function createTypeName(typeName) {
    return `ALCM_interactivity_${typeName}.schema.json`
}

module.exports = {
    outputSchemaFile,
    enhanceSchema,
    fixReference,
    createTypeName
};