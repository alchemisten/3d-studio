import sceneIds from './scene-ids.json';
import type { Project } from '@schablone/3d-studio-core';
import type { HighlightsConfig } from '@schablone/3d-studio-feature-highlights';
import { materialVariants } from '@schablone/3d-studio-feature-material-variants';
import descriptor from '../docs/public/previews/variants-shoe.json';
import { bodyTint, sampleTints } from './sample-tints';
import { openingCamera } from './opening-camera';
import { previewSkybox } from './preview-skybox';

const highlights = {
  highlights: [
    {
      id: 'upper',
      label: 'Upper finish',
      description: 'Choose a finish and tint its texture. Original restores the selected finish.',
      tools: [materialVariants.id, bodyTint.id],
      anchor: { position: [-0.11, 0.19, 0.02] },
      target: { node: 'Shoe', offset: [-0.28, 0.22, 0.19] },
      pointer: { color: '#39766e' },
    },
  ],
} satisfies Partial<HighlightsConfig>;

export const variantsShoe: Project = {
  id: sceneIds.variantsShoe,
  name: 'Variants Shoe',
  description: 'Compare three authored finishes and tint the selected material.',
  tags: ['Shopify', 'CC BY 4.0'],
  source: './models/variants-shoe/MaterialsVariantsShoe.glb',
  thumbnail: './previews/variants-shoe.png',
  openingCamera: openingCamera(descriptor.preview.camera),
  featureConfig: {
    'beauty-shot': { enabled: true, layout: 'details', initial: 'standard' },
    highlights,
    skybox: previewSkybox(descriptor.environment),
    [materialVariants.id]: { initial: 'midnight' },
    [bodyTint.id]: { label: 'Tint', materials: ['phong1SG'], colors: sampleTints },
  },
};
