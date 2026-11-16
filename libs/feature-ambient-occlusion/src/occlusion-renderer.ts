import {
  AddEquation,
  type Camera,
  CustomBlending,
  DoubleSide,
  LessEqualDepth,
  type Material,
  type Mesh,
  MeshBasicMaterial,
  type Object3D,
  OneFactor,
  type PerspectiveCamera,
  Scene,
  SrcColorFactor,
  type Texture,
  Vector2,
  type WebGLRenderer,
  ZeroFactor,
} from 'three';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import type { OcclusionQuality } from './occlusion-level';

export interface OcclusionFrame {
  renderer: WebGLRenderer;
  camera: Camera;
  model: Object3D;
  /** Size of the drawing buffer in pixels. */
  width: number;
  height: number;
  quality: OcclusionQuality;
  /** Reach of the occlusion in world units. */
  radius: number;
  intensity: number;
  /** 0 leaves the image untouched, 1 applies the whole effect. */
  strength: number;
}

export interface OcclusionRenderer {
  /**
   * Darkens the model in the current framebuffer. Call it while the scene is being drawn, after the opaque
   * objects: only fragments where the model is the front-most surface are touched.
   */
  render(frame: OcclusionFrame): void;
  dispose(): void;
}

type OccludableMaterial = Material & { transmission?: number; wireframe?: boolean };

const THICKNESS_PER_RADIUS = 4;
const DEPTH_PHI_PER_RADIUS = 8;
const DENOISE_RINGS = 2;

const castsOcclusion = (material: OccludableMaterial): boolean =>
  material.visible &&
  !material.transparent &&
  material.alphaTest === 0 &&
  !material.wireframe &&
  !(material.transmission && material.transmission > 0) &&
  material.depthWrite &&
  material.depthTest;

const isOccluder = (object: Object3D): boolean => {
  const mesh = object as Mesh;
  if (!mesh.isMesh || object.userData.ambientOcclusion === false) return false;
  return Array.isArray(mesh.material) ? mesh.material.every(castsOcclusion) : castsOcclusion(mesh.material);
};

const isDrawn = (object: Object3D): boolean =>
  'isMesh' in object || 'isLine' in object || 'isPoints' in object || 'isSprite' in object;

const isDeforming = (mesh: Mesh): boolean =>
  'isSkinnedMesh' in mesh || Boolean(mesh.morphTargetInfluences?.length) || 'isBatchedMesh' in mesh;

/**
 * The material the model is drawn with a second time. It multiplies the occlusion onto the pixels the model
 * already covers and leaves alpha alone. A pixel is never darker than its darkest neighbour, which removes
 * the single dark pixels screen-space occlusion leaves on features thinner than a pixel.
 */
const createApplyMaterial = (uniforms: {
  map: { value: Texture | null };
  size: { value: Vector2 };
  intensity: { value: number };
  strength: { value: number };
}): MeshBasicMaterial => {
  const material = new MeshBasicMaterial({
    side: DoubleSide,
    toneMapped: false,
    fog: false,
    depthWrite: false,
    depthFunc: LessEqualDepth,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: ZeroFactor,
    blendDst: SrcColorFactor,
    blendSrcAlpha: ZeroFactor,
    blendDstAlpha: OneFactor,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.dsOcclusionMap = uniforms.map;
    shader.uniforms.dsOcclusionSize = uniforms.size;
    shader.uniforms.dsOcclusionIntensity = uniforms.intensity;
    shader.uniforms.dsOcclusionStrength = uniforms.strength;
    shader.fragmentShader = `
uniform sampler2D dsOcclusionMap;
uniform vec2 dsOcclusionSize;
uniform float dsOcclusionIntensity;
uniform float dsOcclusionStrength;
float dsOcclusionAt(vec2 uv) {
  return texture2D(dsOcclusionMap, uv).r;
}
${shader.fragmentShader.replace(
  '#include <dithering_fragment>',
  `vec2 dsUv = gl_FragCoord.xy / dsOcclusionSize;
  vec2 dsTexel = 1.0 / vec2(textureSize(dsOcclusionMap, 0));
  float dsDarkestNeighbour = 1.0;
  for (int dsX = -1; dsX <= 1; dsX++) {
    for (int dsY = -1; dsY <= 1; dsY++) {
      if (dsX == 0 && dsY == 0) continue;
      dsDarkestNeighbour = min(dsDarkestNeighbour, dsOcclusionAt(dsUv + vec2(float(dsX), float(dsY)) * dsTexel));
    }
  }
  float dsOcclusion = clamp(max(dsOcclusionAt(dsUv), dsDarkestNeighbour), 0.0, 1.0);
  gl_FragColor = vec4(vec3(mix(1.0, pow(dsOcclusion, dsOcclusionIntensity), dsOcclusionStrength)), 1.0);`,
)}`;
  };
  material.customProgramCacheKey = () => 'ds-ambient-occlusion-apply';
  return material;
};

/**
 * Computes ground-truth ambient occlusion for the model alone and multiplies it onto the frame being drawn.
 * The scene itself is rendered as always, so background, tone mapping, colour space and antialiasing stay
 * exactly as they are without the effect. The occlusion is cached while camera, size and model keep still.
 */
export const createOcclusionRenderer = (): OcclusionRenderer => {
  const stage = new Scene();
  stage.matrixWorldAutoUpdate = false;
  const uniforms = {
    map: { value: null as Texture | null },
    size: { value: new Vector2(1, 1) },
    intensity: { value: 1 },
    strength: { value: 1 },
  };
  const applyMaterial = createApplyMaterial(uniforms);
  const masked: { object: Object3D; mask: number }[] = [];
  const quad = new FullScreenQuad();
  let pass: GTAOPass | null = null;
  let computed = Number.NaN;

  /** Takes everything that casts no occlusion out of the draw and returns a signature of what is left. */
  const isolateOccluders = (model: Object3D): number => {
    let signature = 0;
    let index = 0;
    const visit = (object: Object3D) => {
      if (!object.visible) return;
      if (isOccluder(object)) {
        const mesh = object as Mesh;
        const { elements } = object.matrixWorld;
        index += 1;
        let local = mesh.geometry.id * 7 + object.id;
        for (let item = 0; item < 16; item += 1) local += elements[item] * (item + 1);
        signature += local * (1 + (index % 97));
        if (isDeforming(mesh)) signature = Number.NaN;
      } else if (isDrawn(object)) {
        masked.push({ object, mask: object.layers.mask });
        object.layers.mask = 0;
      }
      object.children.forEach(visit);
    };
    visit(model);
    return signature;
  };

  const restoreMasked = () => {
    masked.forEach(({ object, mask }) => {
      object.layers.mask = mask;
    });
    masked.length = 0;
  };

  const frameSignature = ({ camera, width, height, quality, radius }: OcclusionFrame, content: number): number => {
    let signature = content + width * 3 + height * 5 + radius * 7919 + quality.resolutionScale * 11 + quality.samples;
    const world = camera.matrixWorld.elements;
    const projection = camera.projectionMatrix.elements;
    for (let item = 0; item < 16; item += 1) signature += world[item] * (item + 17) + projection[item] * (item + 37);
    return signature;
  };

  /**
   * Runs the denoiser a second time with another noise rotation. The raw occlusion buffer takes the result:
   * its background is already white and the denoiser leaves background pixels alone.
   */
  const denoiseAgain = (
    renderer: WebGLRenderer,
    { pdMaterial, pdRenderTarget, gtaoRenderTarget }: GTAOPass,
  ): Texture => {
    const isAutoClear = renderer.autoClear;
    pdMaterial.uniforms.tDiffuse.value = pdRenderTarget.texture;
    pdMaterial.uniforms.index.value = 1;
    quad.material = pdMaterial;
    renderer.setRenderTarget(gtaoRenderTarget);
    renderer.autoClear = false;
    quad.render(renderer);
    renderer.autoClear = isAutoClear;
    return gtaoRenderTarget.texture;
  };

  const compute = ({ renderer, camera, width, height, quality, radius }: OcclusionFrame): Texture => {
    const bufferWidth = Math.max(1, Math.round(width * quality.resolutionScale));
    const bufferHeight = Math.max(1, Math.round(height * quality.resolutionScale));
    pass ??= new GTAOPass(stage, camera, bufferWidth, bufferHeight);
    pass.normalMaterial.side = DoubleSide;
    pass.camera = camera;
    const isPerspective = (camera as PerspectiveCamera).isPerspectiveCamera ? 1 : 0;
    if (pass.gtaoMaterial.defines.PERSPECTIVE_CAMERA !== isPerspective) {
      pass.gtaoMaterial.defines.PERSPECTIVE_CAMERA = isPerspective;
      pass.gtaoMaterial.needsUpdate = true;
    }
    if (pass.width !== bufferWidth || pass.height !== bufferHeight) pass.setSize(bufferWidth, bufferHeight);
    pass.updateGtaoMaterial({
      radius,
      thickness: radius * THICKNESS_PER_RADIUS,
      distanceExponent: 1,
      distanceFallOff: 1,
      scale: 1,
      samples: quality.samples,
      screenSpaceRadius: false,
    });
    pass.updatePdMaterial({
      lumaPhi: 10,
      depthPhi: radius * DEPTH_PHI_PER_RADIUS,
      normalPhi: 3,
      radius: quality.denoiseRadius,
      rings: DENOISE_RINGS,
      samples: quality.denoiseSamples,
    });
    pass.output = GTAOPass.OUTPUT.Off;
    pass.pdMaterial.uniforms.tDiffuse.value = pass.gtaoRenderTarget.texture;
    pass.pdMaterial.uniforms.index.value = 0;
    pass.render(renderer, null as never, null as never, 0, false);
    return quality.denoisePasses > 1 ? denoiseAgain(renderer, pass) : pass.pdRenderTarget.texture;
  };

  return {
    render: (frame) => {
      const { renderer, camera, model, width, height } = frame;
      const target = renderer.getRenderTarget();
      const isAutoClear = renderer.autoClear;
      const isShadowAutoUpdate = renderer.shadowMap.autoUpdate;
      const isInfoAutoReset = renderer.info.autoReset;
      stage.children = [model];
      try {
        const signature = frameSignature(frame, isolateOccluders(model));
        renderer.shadowMap.autoUpdate = false;
        renderer.info.autoReset = false;
        if (signature !== computed || !uniforms.map.value) {
          uniforms.map.value = compute(frame);
          computed = signature;
          renderer.setRenderTarget(target);
        }
        uniforms.size.value.set(width, height);
        uniforms.intensity.value = frame.intensity;
        uniforms.strength.value = frame.strength;
        stage.overrideMaterial = applyMaterial;
        renderer.autoClear = false;
        renderer.render(stage, camera);
      } finally {
        stage.overrideMaterial = null;
        stage.children = [];
        restoreMasked();
        renderer.autoClear = isAutoClear;
        renderer.shadowMap.autoUpdate = isShadowAutoUpdate;
        renderer.info.autoReset = isInfoAutoReset;
        renderer.setRenderTarget(target);
      }
    },
    dispose: () => {
      quad.dispose();
      pass?.dispose();
      pass?.gtaoMaterial.dispose();
      pass?.blendMaterial.dispose();
      pass = null;
      applyMaterial.dispose();
      uniforms.map.value = null;
    },
  };
};
