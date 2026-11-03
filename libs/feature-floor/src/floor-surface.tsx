import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color,
  DoubleSide,
  MeshDepthMaterial,
  OrthographicCamera,
  Scene,
  LinearMipmapLinearFilter,
  WebGLRenderTarget,
  type Object3D,
} from 'three';
import { createShadowFilter } from './shadow-filter';
import { createPoseTracker } from './pose-tracker';
import { floorBounds } from './floor-bounds';

export type FloorMode = 'off' | 'shadow' | 'matte';
export interface FloorConfig {
  mode: FloorMode;
  color: string;
}

const vertexShader = `
varying vec2 point;
void main() {
  point = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
varying vec2 point;
uniform sampler2D heights;
uniform vec3 tint;
uniform bool matte;
void main() {
  vec2 centered = point - 0.5;
  vec2 shadowUV = vec2(centered.x, -centered.y) * 4.0 + 0.5;
  float shadow = 0.0;
  if (all(greaterThan(shadowUV, vec2(0.0))) && all(lessThan(shadowUV, vec2(1.0)))) {
    vec2 occlusion = texture2D(heights, shadowUV).rg;
    shadow = 1.0 - (1.0 - 0.49 * occlusion.r) * (1.0 - 0.29 * occlusion.g);
  }
  float surface = matte ? (1.0 - smoothstep(0.08, 0.49, length(centered))) * 0.92 : 0.0;
  float alpha = surface + shadow * (1.0 - surface);
  gl_FragColor = vec4(tint * surface * (1.0 - shadow) / max(alpha, 0.00001), alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const FloorSurface = ({
  model,
  mode,
  color,
  animated = false,
  onShadowReady,
}: FloorConfig & {
  model: Object3D;
  animated?: boolean;
  onShadowReady?: () => void;
}) => {
  const bounds = useMemo(() => floorBounds(model), [model]);
  const pass = useMemo(() => {
    if (!bounds) return null;
    const { x, y, z, span, depth } = bounds;
    const radius = span * 0.8125;
    const camera = new OrthographicCamera(-radius, radius, radius, -radius, 0, depth);
    camera.position.set(x, y, z);
    camera.up.set(0, 0, 1);
    camera.lookAt(x, y + 1, z);
    const scene = new Scene();
    scene.matrixWorldAutoUpdate = false;
    scene.children = [model];
    const material = new MeshDepthMaterial({ side: DoubleSide });
    scene.overrideMaterial = material;
    scene.background = new Color(0);
    const target = new WebGLRenderTarget(512, 512, { generateMipmaps: true, minFilter: LinearMipmapLinearFilter });
    return { scene, material, camera, target, filter: createShadowFilter() };
  }, [model, bounds]);
  const poseChanged = useMemo(createPoseTracker, [model]);
  const captured = useRef<typeof pass>(null);
  const uniforms = useMemo(
    () => ({
      heights: { value: pass?.filter.texture },
      tint: { value: new Color(color) },
      matte: { value: mode === 'matte' },
    }),
    [pass, mode, color],
  );
  useEffect(
    () => () => {
      captured.current = null;
      pass?.material.dispose();
      pass?.target.dispose();
      pass?.filter.dispose();
    },
    [pass],
  );
  useFrame(({ gl }) => {
    if (!pass) return;
    const dirty = animated && poseChanged(model);
    if (captured.current === pass && !dirty) return;
    const previous = gl.getRenderTarget();
    try {
      if (!animated) model.updateWorldMatrix(true, true);
      gl.setRenderTarget(pass.target);
      gl.render(pass.scene, pass.camera);
      pass.filter.apply(gl, pass.target);
    } finally {
      gl.setRenderTarget(previous);
    }
    if (captured.current !== pass) onShadowReady?.();
    captured.current = pass;
  });
  if (!bounds || mode === 'off') return null;
  return (
    <mesh position={[bounds.x, bounds.y, bounds.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
      <planeGeometry args={[bounds.span * 6.5, bounds.span * 6.5]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
};
