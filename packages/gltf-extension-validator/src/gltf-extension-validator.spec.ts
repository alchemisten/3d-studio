import 'mocha';

import { readFileSync } from 'fs';
import { validateBytes } from 'gltf-validator';
import {equal} from "assert";
import * as ALCM from '@alchemisten/gltf-extension/lib/extension/alcm-interactivity/gltf-alcm-interactivity';

const SAMPLE_TRIANGLE_BASIC = 'samples/Triangle/Triangle.gltf';

describe('GLTF Validator', () => {

    // actual tests
    it(`normal validation`, async () => {
        const asset = readFileSync(SAMPLE_TRIANGLE_BASIC);

        const res = await validateBytes(new Uint8Array(asset));
            //.then((report) => console.info('Validation succeeded: ', report))
            //.catch((error) => console.error('Validation failed: ', error));

        equal(res.mimeType, "model/gltf+json", "Weird mimeTye.");
    });
});