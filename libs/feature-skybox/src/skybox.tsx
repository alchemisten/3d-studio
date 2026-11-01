import { Environment } from '@react-three/drei';
import { defineFeature, useFeature } from '@schablone/3d-studio-core';

export type SkyboxType = 'cube' | 'equirectangular';

export interface SkyboxConfig {
  /** Set to `false` to disable without removing the feature. */
  enabled: boolean;
  /**
   * `equirectangular`: URL of a single image (.hdr, .exr, .jpg).
   * `cube`: base URL of a folder containing the six faces named by `faces`.
   */
  path: string;
  type: SkyboxType;
  /** Light the model with the skybox, not only show it as background. */
  useAsEnvironment: boolean;
  /** Cube only: file names in the order +x, -x, +y, -y, +z, -z. */
  faces: [string, string, string, string, string, string];
}

const DEFAULT_FACES: SkyboxConfig['faces'] = [
  'pos-x.jpg',
  'neg-x.jpg',
  'pos-y.jpg',
  'neg-y.jpg',
  'pos-z.jpg',
  'neg-z.jpg',
];

const SkyboxScene = () => {
  const { config } = useFeature<SkyboxConfig>();
  if (!config.enabled || !config.path) {
    return null;
  }
  const background = config.useAsEnvironment ? true : 'only';
  return config.type === 'cube' ? (
    <Environment files={config.faces} path={`${config.path.replace(/\/$/, '')}/`} background={background} />
  ) : (
    <Environment files={config.path} background={background} />
  );
};

/** glTF extension: `ALCM_skybox`. Usage: `<Viewer features={[skybox.use({ path: '/sky.hdr', type: 'equirectangular' })]} />` */
export const skybox = defineFeature<SkyboxConfig>({
  id: 'skybox',
  defaults: { enabled: true, path: '', type: 'cube', useAsEnvironment: true, faces: DEFAULT_FACES },
  gltf: { extension: 'ALCM_skybox' },
  scene: SkyboxScene,
});
