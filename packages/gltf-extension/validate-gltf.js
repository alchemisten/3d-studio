const fs = require("fs");
const path = require("path");
const validator = require('gltf-validator');

const inputFilePath = process.argv[2] || "./out/Box/";
const filename = process.argv[3] || "Box.gltf";

const fullpath = path.resolve(inputFilePath, filename);

/**
 *
 * @link ./node_modules/gltf-validator/module.mjs
 *
 * @type {{
 * uri: string, // Absolute or relative asset URI that will be copied to validation report.
 * externalResourceFunction: (function(*=): Promise<unknown>), // Function for loading external resources. If omitted, external resources are not validated.
 * validateAccessorData: boolean, // Set to false to skip reading of accessor data. Default is true.
 * writeTimestamp: boolean, // Set to false to omit timestamp from the validation report. Default is true.
 * maxIssues: number, // Max number of reported issues. Use 0 for unlimited output.
 * ignoredIssues: [string], // Array of ignored issue codes.
 * severityOverrides: {ACCESSOR_INDEX_TRIANGLE_DEGENERATE: number}, // Object with overridden severities for issue codes.
 * }}
 */
const validationOptions = {
    uri: filename,
    maxIssues: 10,
    // ignoredIssues: ['UNSUPPORTED_EXTENSION'], // mute UNSUPPORTED_EXTENSION issue
    // severityOverrides: {'ACCESSOR_INDEX_TRIANGLE_DEGENERATE': 0}, // treat degenerate triangles as errors
    externalResourceFunction: (uri) =>
        new Promise((resolve, reject) => {
            uri = path.resolve(path.dirname(fullpath), decodeURIComponent(uri));
            console.info("Loading external file: " + uri);
            fs.readFile(uri, (err, data) => {
                if (err) {
                    console.error(err.toString());
                    reject(err.toString());
                    return;
                }
                resolve(data);
            });
        })
};


const asset = fs.readFileSync(fullpath);
validator.validateBytes(new Uint8Array(asset), validationOptions).then((result) => {
    console.log("Validation successful:\n", JSON.stringify(result, null, '  '));
}, (result) => {
    // Promise rejection means that arguments were invalid or validator was unable
    // to detect file format (glTF or GLB).
    // [result] will contain exception string.
    console.error(result);
});