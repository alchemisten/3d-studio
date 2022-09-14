export default // language=glsl
`
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
        float h = max(normalize(vWorldPosition + offset).y, 0.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, pow(h, exponent)), 1.0);
    }
`;