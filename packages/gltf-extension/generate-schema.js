const path = require('path');
const camelCase = require('camelcase');

// schema generator
const SchemaGenerator = require('ts-json-schema-generator/dist/factory/generator');
const DefaultConfig = require('ts-json-schema-generator/dist/src/Config');

// other
const { enhanceSchema, 
        outputSchemaFile, 
        createTypeName,
        fixReference 
} = require('./utils');

console.log('Generating schema...');

const schema = SchemaGenerator.createGenerator({
    ...DefaultConfig.DEFAULT_CONFIG,
    strictTuples: false,
    path: path.resolve(__dirname, './src/**.ts'),
    unstable: true
}).createSchema();

// normalize all $refs
Object.keys(schema.definitions).forEach(typeName => {
    const type = schema.definitions[typeName];

    // first the type itself
    if(type.allOf) {
        type.allOf = type.allOf.map(fixReference);

        // mark for usage
        type.allOf.forEach(refType => {
            if(schema.definitions[refType]) {
                schema.definitions[refType].__used = true;
            }
        });
    }

    // then all properties
    if(type.properties) {
        Object.keys(type.properties).forEach(propName => {
            const prop = type.properties[propName];
            // is array
            if(prop.items && prop.items.$ref) {
                const def = prop.items.$ref.replace('#/definitions/', '');
                if(schema.definitions[def]) {
                    const refProps = schema.definitions[def];
                    refProps.__used = true;
                    if(refProps.type === 'object') {
                        prop.items.$ref = fixReference(prop.items, typeName);
                        if(!refProps.__parent) {
                            refProps.__parent = typeName;
                        }
                    } else {
                        prop.items = refProps;
                        refProps.__hide = true;
                    }
                }
            }

            // reference to other object
            if(prop.$ref) {
                const refKey = prop.$ref.replace('#/definitions/', '');
                prop.$ref = fixReference(prop, typeName);
                
                if(schema.definitions[refKey]) {
                    schema.definitions[refKey].__used = true;

                    if(!schema.definitions[refKey].__parent) {
                        schema.definitions[refKey].__parent = typeName;
                    }
                }
            }
        });
    }
});

console.log('Creating output...');

const { definitions: { ALCMInteractivity, ...types }, ...other } = schema;

// toplevel schema
const toplevelSchema = enhanceSchema({
    description: 'glTF extension for describing interactive elements in 3d scenes',
    allOf: [ 
        { 
            $ref: 'glTFProperty.schema.json' 
        } 
    ]
}, { properties: ALCMInteractivity.properties });
outputSchemaFile('gltf.ALCM_interactivity.schema.json', toplevelSchema);

// opther types
const { Material, ...otherTypes } = types;

// material TODO my be removed because of manual extension
const materialSchema = enhanceSchema({
    description: 'Extra properties that transport changeable material properties',
    allOf: [
        {
            $ref: 'material.schema.json'
        }
    ]
}, { properties: Material.properties });
outputSchemaFile('material.schema.json', materialSchema);

// all others
Object.keys(otherTypes).forEach(typeName => {
    const { __hide, __used, __parent,  ...type} = otherTypes[typeName];
    if(!__hide && __used) {
        const extraTypeSchema = enhanceSchema({
            title: typeName
        }, type);

        outputSchemaFile(createTypeName(camelCase(typeName), __parent ? camelCase(__parent): '' ), extraTypeSchema);
    }
});