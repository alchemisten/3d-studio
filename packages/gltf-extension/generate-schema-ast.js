const path = require('path');
const camelCase = require('camelcase');

const ALCM_interactivity_extension_name = "ALCM_interactivity";

// schema generator
const SchemaGenerator = require('ts-json-schema-generator/dist/factory/generator');
const DefaultConfig = require('ts-json-schema-generator/dist/src/Config');

// other
const { enhanceSchema,
    outputSchemaFile,
    createTypeName,
    fixReference,
    ensureSchemaRootExists
} = require('./utils');

console.log('Generating schema...');
ensureSchemaRootExists();

const schema = SchemaGenerator.createGenerator({
    ...DefaultConfig.DEFAULT_CONFIG,
    strictTuples: false,
    path: path.resolve(__dirname, './src/extension/alcm/**.ts'),
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

    // first the type itself
    if(type.additionalProperties && type.additionalProperties.$ref) {
        type.additionalProperties.$ref = fixReference(type.additionalProperties);
        const refKey = type.additionalProperties.$ref;
        if(schema.definitions[refKey]) {
            schema.definitions[refKey].__used = true;
        }
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

let types = schema.definitions;
const topLevelTypes = [
    {clazz:"Interactivity", name:"glTF"},
    {clazz:"MaterialExtension", name:"material"},
    {clazz:"MeshesExtension", name:"meshes"},
    {clazz:"NodeExtension", name:"node"}
];

topLevelTypes.forEach(schema =>
    types = createTopLevelSchemaExtensions(schema.clazz, schema.name, types)
);

// all others
Object.keys(types).forEach(typeName => {
    if(!(types[typeName] == null)){
        const { __hide, __used, __parent,  ...type} = types[typeName];
        if(!__hide && __used) {
            const extraTypeSchema = enhanceSchema({
                title: typeName,
                allOf: [
                    {
                        $ref: 'glTFChildOfRootProperty.schema.json'
                    }
                ]
            }, type);

            const schemaName = createTypeName(camelCase(typeName), __parent ? camelCase(__parent): '' );
            outputSchemaFile(schemaName, extraTypeSchema);
            console.log("Created schema for " + schemaName)
        }
    } else {
        console.log("Couldn't retrieve type for " + typeName)
    }
});

function createTopLevelSchemaExtensions(extensionClass, extensionName, types) {
    const extClass = types[extensionClass];

    const materialSchema = enhanceSchema({
        title: ALCM_interactivity_extension_name+" "+ extensionName +" extension",
        description: 'Extra properties that transport changeable material properties',
        allOf: [
            {
                $ref: 'glTFProperty.schema.json'
            }
        ]
    }, { properties: extClass.properties });
    outputSchemaFile(extensionName+"."+ALCM_interactivity_extension_name+".schema.json", materialSchema);

    console.log("Created top level schema for " + extensionClass);
    const {[extensionClass]:extKey, ...typesNew} = types;
    return typesNew
}