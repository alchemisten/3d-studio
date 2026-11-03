import { beautyShot } from '@schablone/3d-studio-feature-beauty-shot';
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

export const sampleFeatures = [...defaultFeatures, floor, materialVariants, bodyTint, beautyShot];

export const sampleScenes = createStaticAdapter([
  milkTruck,
  variantsShoe,
  {
    id: sceneIds.deskLamp,
    name: 'Brass Desk Lamp',
    description: 'Look under the shade for warm light on the slate, and into the brass for reflections of the walnut slats.',
    tags: ['Lighting', 'Product design'],
    openingCamera: { position: [1.65, 1.12, 2.95], target: [0, 0.90, 0] },
    thumbnail: './previews/desk-lamp.png',
    source: './models/desk-lamp/desk-lamp.glb',
    featureConfig: {
      floor: { mode: 'off' },
      skybox: previewSkybox(descriptor.environment),
      'beauty-shot': { enabled: true, layout: 'details', initial: 'high' },
    },
  },
  {
    id: sceneIds.toyCar,
    openingCamera: openingCamera(descriptor.preview.camera),
    thumbnail: './previews/toy-car.png',
    name: 'Toy Car',
    description: 'Inspect the glass canopy, fabric display, and clearcoat finish.',
    tags: ['Guido Odendahl and Eric Chadwick', 'CC0'],
    source: './models/toy-car/ToyCar.glb',
    featureConfig: { 'beauty-shot': { enabled: true, layout: 'details', initial: 'standard' }, skybox: previewSkybox(descriptor.environment) },
  },
]);
