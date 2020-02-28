import { expect } from 'chai';
import 'mocha';

import { writeFileSync, readFileSync } from 'fs';
//import { validateBytes } from 'gltf-validator';

const SAMPLE_TRIANGLE_BASIC = 'samples/Triangle/Triangle.gltf';

describe('GLTF Validator', () => {

    // actual tests
    it(`normal validation`, async () => {
        const asset = readFileSync(SAMPLE_TRIANGLE_BASIC);

        //validateBytes(new Uint8Array(asset))
            //.then((report) => console.info('Validation succeeded: ', report))
            //.catch((error) => console.error('Validation failed: ', error));

        //expect(reader.getContainer()).not.equal(undefined, 'Expected container to be present');
    });

});