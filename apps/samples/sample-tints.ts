import { createColorTool } from '@schablone/3d-studio-feature-color-switcher';

export const bodyTint = createColorTool('body-tint');

export const sampleTints = [
  { id: 'sage', label: 'Sage', color: '#83ab91' },
  { id: 'ochre', label: 'Ochre', color: '#dda85d' },
  { id: 'slate', label: 'Slate blue', color: '#7095b5' },
];

export const bodyPaint = bodyTint.use({ materials: ['truck'], colors: sampleTints });
