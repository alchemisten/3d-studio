import {
  HalfFloatType,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';

const resolution = 128;
const vertexShader = `
varying vec2 point;
void main() {
  point = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragmentShader = `
varying vec2 point;
uniform sampler2D source;
uniform vec2 direction;
uniform bool firstPass;
void main() {
  vec2 sum = vec2(0.0);
  vec2 total = vec2(0.0);
  for (int i = -18; i <= 18; i++) {
    float offset = float(i);
    vec2 variance = vec2(1.85 * 1.85, 6.0 * 6.0);
    vec2 weight = exp(vec2(-0.5 * offset * offset) / variance);
    vec2 heights = texture2D(source, point + direction * offset).rg;
    sum += weight * (firstPass ? vec2(pow(heights.r, 5.0), heights.r) : heights);
    total += weight;
  }
  gl_FragColor = vec4(sum / total, 0.0, 1.0);
}`;

export const createShadowFilter = () => {
  const intermediate = new WebGLRenderTarget(resolution, resolution, { depthBuffer: false, type: HalfFloatType });
  const result = new WebGLRenderTarget(resolution, resolution, { depthBuffer: false, type: HalfFloatType });
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      source: { value: intermediate.texture },
      direction: { value: new Vector2() },
      firstPass: { value: true },
    },
  });
  const geometry = new PlaneGeometry(2, 2);
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    texture: result.texture,
    apply: (gl: WebGLRenderer, depth: WebGLRenderTarget) => {
      material.uniforms.firstPass.value = true;
      material.uniforms.direction.value.set(1 / resolution, 0);
      material.uniforms.source.value = depth.texture;
      gl.setRenderTarget(intermediate);
      gl.render(scene, camera);
      material.uniforms.firstPass.value = false;
      material.uniforms.direction.value.set(0, 1 / resolution);
      material.uniforms.source.value = intermediate.texture;
      gl.setRenderTarget(result);
      gl.render(scene, camera);
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      intermediate.dispose();
      result.dispose();
    },
  };
};
