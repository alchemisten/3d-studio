import sceneIds from './scene-ids.json';
import { bodyPaint, bodyTint } from './sample-tints';
import { previewSkybox } from './preview-skybox';
import descriptor from '../docs/public/previews/milk-truck.json';
import { openingCamera } from './opening-camera';
import type { Project } from '@schablone/3d-studio-core';
import type { HighlightsConfig } from '@schablone/3d-studio-feature-highlights';

export const milkTruckHighlights = {
  pauseOnHover: false,
  select: 'playback',
  highlights: [
    {
      id: 'headlamp',
      label: 'Headlamp',
      description: 'The lamp stays fixed to the grille as the wheels turn. Orbit around the cab to see its marker line fade behind the bodywork.',
      actions: [{ id: 'inspect-wheel', label: 'Inspect front wheel', run: { focus: 'wheel' } }],
      anchor: { position: [-1.8, 1.6, 2.6] },
      target: { node: 'Cesium_Milk_Truck', offset: [2.39, 0.84, -1.03] },
      pointer: { color: '#39766e' },
      camera: { position: [-4, 2.5, 6] },
    },
    {
      id: 'wheel',
      hoverOutline: true,
      label: 'Front wheel',
      description: 'The pointer is attached to the rim. As the wheel turns, its tip traces a circle around the axle.',
      actions: [
        { id: 'freeze', requiresFeature: 'animation', label: 'Freeze wheel', run: { pause: 'Wheels' } },
        {
          id: 'replay',
          requiresFeature: 'animation',
          label: 'Replay rotation',
          run: (viewer) => {
            viewer.emit('animation:seek', { clip: 'Wheels', time: 0 });
            viewer.emit('animation:play', { clip: 'Wheels' });
          },
        },
        { id: 'inspect-lamp', label: 'Inspect headlamp', run: { focus: 'headlamp' } },
      ],
      anchor: { position: [-2.1, 0.5, 0.7] },
      target: { node: 'Wheels', offset: [0.2, 1.04, 0] },
      pointer: { color: '#39766e' },
      camera: { position: [-5, 2.1, 4] },
    },
    {
      id: 'body-panel',
      label: 'Body panel',
      description: 'Tint the painted bodywork. The printed graphics share the same finish.',
      tools: [bodyTint.id],
      anchor: { position: [-1.9, 2.55, -1.6] },
      target: { node: 'Cesium_Milk_Truck', offset: [-1.1, 1.06, -1.95] },
      pointer: { color: '#39766e' },
      camera: { position: [-5.2, 2.6, -2.6] },
      actions: [{ id: 'inspect-lamp', label: 'Inspect headlamp', run: { focus: 'headlamp' } }],
    },
  ],
} satisfies Partial<HighlightsConfig>;

export const milkTruck: Project = {
  id: sceneIds.milkTruck,
  openingCamera: openingCamera(descriptor.preview.camera),
  thumbnail: './previews/milk-truck.png',
  name: 'Milk Truck',
  tags: ['Cesium', 'CC BY 4.0'],
  description: 'Inspect the headlamp and animated front wheel.',
  source: './models/milk-truck-draco/CesiumMilkTruck.gltf',
  featureConfig: { [bodyTint.id]: bodyPaint.config, highlights: milkTruckHighlights, skybox: previewSkybox(descriptor.environment) },
};
