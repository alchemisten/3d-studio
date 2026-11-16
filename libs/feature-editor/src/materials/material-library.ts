import { z } from 'zod';
import {
  DoubleSide,
  FrontSide,
  type Material,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';

const unit = z.number().min(0).max(1);

const pbrMaterialSchema = z.object({
  /** sRGB colour as `#rrggbb`. */
  baseColor: z.string().default('#ffffff'),
  roughness: unit.default(0.5),
  metalness: unit.default(0),
  opacity: unit.default(1),
  /** Renders back faces too, e.g. for open shells. */
  doubleSided: z.boolean().default(false),
  /** URLs of the optional texture maps. */
  maps: z
    .object({
      baseColor: z.string().optional(),
      normal: z.string().optional(),
      roughness: z.string().optional(),
      metalness: z.string().optional(),
    })
    .default({}),
});

export const libraryMaterialSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  /** A second line under the name, e.g. a colour code. */
  meta: z.string().optional(),
  /** Groups materials in the browser, e.g. a collection or finish. */
  group: z.string().optional(),
  /** Preview image of the swatch. */
  imageUrl: z.string().optional(),
  material: pbrMaterialSchema,
});

/** PBR parameters of a library material, with defaults applied. */
export type PbrMaterial = z.output<typeof pbrMaterialSchema>;

/** A material of the host's library as the editor uses it. */
export type LibraryMaterial = z.output<typeof libraryMaterialSchema>;

/** A material of the host's library as the host supplies it; PBR parameters are optional. */
export type LibraryMaterialInput = z.input<typeof libraryMaterialSchema>;

/** A texture map of a library material could not be loaded. */
export class TextureLoadError extends Error {
  public constructor(url: string, options?: ErrorOptions) {
    super(`Texture could not be loaded: ${url}`, options);
    this.name = 'TextureLoadError';
  }
}

export interface ThreeMaterialOptions {
  /** Called whenever a texture map finished loading, e.g. to request a frame. */
  onTextureLoad?: () => void;
  /** Called when a texture map fails; by default the failure is thrown. */
  onTextureError?: (error: TextureLoadError) => void;
}

const rethrow = (error: TextureLoadError): never => {
  throw error;
};

const loadTexture = (url: string | undefined, isColor: boolean, options: ThreeMaterialOptions): Texture | null => {
  if (!url) return null;
  const texture = new TextureLoader().load(
    url,
    () => options.onTextureLoad?.(),
    undefined,
    (cause) => (options.onTextureError ?? rethrow)(new TextureLoadError(url, { cause })),
  );
  texture.colorSpace = isColor ? SRGBColorSpace : NoColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
};

/** Builds the three.js material of a library entry; its texture maps load asynchronously. */
export const toThreeMaterial = (entry: LibraryMaterial, options: ThreeMaterialOptions = {}): MeshStandardMaterial => {
  const { baseColor, roughness, metalness, opacity, doubleSided, maps } = entry.material;
  const material = new MeshStandardMaterial({
    color: baseColor,
    roughness,
    metalness,
    opacity,
    transparent: opacity < 1,
    side: doubleSided ? DoubleSide : FrontSide,
    map: loadTexture(maps.baseColor, true, options),
    normalMap: loadTexture(maps.normal, false, options),
    roughnessMap: loadTexture(maps.roughness, false, options),
    metalnessMap: loadTexture(maps.metalness, false, options),
  });
  material.name = entry.name;
  return material;
};

/** Disposes a material together with every texture it references. */
export const disposeMaterial = (material: Material): void => {
  Object.values(material).forEach((value) => {
    if (value instanceof Texture) value.dispose();
  });
  material.dispose();
};
