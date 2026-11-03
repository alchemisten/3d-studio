import type { SkyboxConfig } from '@schablone/3d-studio-feature-skybox';

export const previewSkybox = (environment: string): Partial<SkyboxConfig> => ({
  path: './previews/' + environment,
  type: 'equirectangular',
  useAsEnvironment: true,
  backgroundBlurriness: 0.45,
});
