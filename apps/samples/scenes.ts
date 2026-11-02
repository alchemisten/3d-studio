import sceneIds from './scene-ids.json';
import { previewSkybox } from './preview-skybox';
import { variantsShoe } from './variants-shoe';
import { materialVariants } from '@schablone/3d-studio-feature-material-variants';
import { floor } from '@schablone/3d-studio-feature-floor';
import { defaultFeatures } from '@schablone/3d-studio';
import descriptor from '../docs/public/previews/toy-car.json';
import { openingCamera } from './opening-camera';
import { createStaticAdapter } from '@schablone/3d-studio-core';
import { milkTruck } from './milk-truck';
import { bodyTint } from './sample-tints';

export const sampleFeatures = [...defaultFeatures, floor, materialVariants, bodyTint];

export const sampleScenes = createStaticAdapter([
  milkTruck,
  variantsShoe,
  {
    id: sceneIds.toyCar,
    openingCamera: openingCamera(descriptor.preview.camera),
    thumbnail: './previews/toy-car.png',
    name: 'Toy Car',
    description: 'Inspect the glass canopy, fabric display, and clearcoat finish.',
    tags: ['Guido Odendahl and Eric Chadwick', 'CC0'],
    source: './models/toy-car/ToyCar.glb',
    featureConfig: { skybox: previewSkybox(descriptor.environment) },
  },
]);
