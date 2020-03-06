import 'mocha';

import {readFileSync} from 'fs';
import * as path from 'path';
import {validateBytes} from 'gltf-validator';
import {equal, notEqual} from "assert";
import {GLTF2} from "@alchemisten/gltf-extension/src/GLTF2";

const SAMPLE_TRIANGLE_BASIC = 'samples/Triangle/Triangle.gltf';
const ALCM_INTERACTIVITY_EXT_NAME = "ALCM_interactivity";


function validReport(report){
    equal(report.issues.numErrors, 0, "Errors found.");
    equal(report.issues.numWarnings, 0, "Warnings found.");
    equal(report.issues.numInfos, 0, "Infos found.");
    equal(report.issues.numHints, 0, "Hints found.");
}

describe('GLTF Validator', () => {
    let report = null;
    let error = null;
    before((done) => {
        const asset = readFileSync(SAMPLE_TRIANGLE_BASIC);
        validateBytes(new Uint8Array(asset))
            .then((_report) => {
                report = _report;
                done();
            })
            .catch((_error) => {
                report = _error;
                done();
            });
    });

    it(`no exception during validation`, () => {
        equal(error, null, "Validation threw exception: " + error);
    });

    it(`mime type validation`, () => {
        equal(report.mimeType, "model/gltf+json", "Wrong mimeTye.");
    });

    it(`zero errors test`, () => {
        validReport(report)
    });
});

describe('GLTF Extension Validation', () => {
    //TODO Gibt es da iwas besseres? Wollte es per require("@alchemisten/...") machen aber da hat er eine Uncaught SyntaxError: Unexpected token with JSON.parse bekommen.
    //const raw = require("@alchemisten/gltf-extension/samples/sample_alcm.gltf");
    const raw = readFileSync(path.resolve("../gltf-extension/samples/sample_alcm.gltf"));
    let gltf: GLTF2.GLTF = JSON.parse(raw.toString());

    it(`Validation by normal validator`, () => {
        const validationOptions = {
            // maxIssues: 10,
             ignoredIssues: ['UNSUPPORTED_EXTENSION', 'UNDECLARED_EXTENSION'], // mute UNSUPPORTED_EXTENSION issue
            // severityOverrides: {'ACCESSOR_INDEX_TRIANGLE_DEGENERATE': 0}, // treat degenerate triangles as errors
        };

        validateBytes(new Uint8Array(raw), validationOptions)
            .then((_report) => {
                validReport(_report)
            })
    });

    it(`Scenes defined`, () => {
        notEqual(gltf.scenes.length, 0, "No scenes defined!");
    });

    it(`Extensions defined`, () => {
        notEqual(gltf.extensionsUsed.length, 0, "No extensions defined");
    });

    it( `${ALCM_INTERACTIVITY_EXT_NAME} extension defined`, () => {
        equal(gltf.extensions.hasOwnProperty(ALCM_INTERACTIVITY_EXT_NAME), true,  `No ${ALCM_INTERACTIVITY_EXT_NAME} extension found`);
    });
});
