// GLSL for the Sundering scene. One point program drives every particle
// layer (vortex, stars, embers); layers differ only by uniforms.

const NOISE = /* glsl */ `
  float hash31(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x), mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x), mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return s;
  }
`;

export const pointsVert = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uRotSpeed;
  uniform float uShear;
  uniform float uTwinkle;
  uniform float uFade;
  uniform float uRise;     // embers: vertical drift speed (0 = static layer)
  uniform float uRiseSpan; // embers: height of the loop
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aBright;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vBright;

  void main() {
    vec3 p = position;

    // differential rotation: the inner vortex turns faster than the rim
    float r = length(p.xz);
    float ang = uTime * uRotSpeed * (1.0 - uShear * clamp(r / 7.0, 0.0, 1.0));
    float c = cos(ang), s = sin(ang);
    p.xz = mat2(c, -s, s, c) * p.xz;

    float life = 1.0;
    if (uRise > 0.0) {
      // embers loop upward with a lazy sideways wander, fading at both ends
      float h = mod(p.y + uTime * uRise * (0.55 + aSeed), uRiseSpan);
      life = smoothstep(0.0, 0.18, h / uRiseSpan) * (1.0 - smoothstep(0.62, 1.0, h / uRiseSpan));
      p.y = h - uRiseSpan * 0.35;
      p.x += sin(uTime * (0.4 + aSeed) + aSeed * 40.0) * 0.35;
      p.z += cos(uTime * (0.3 + aSeed * 0.7) + aSeed * 21.0) * 0.25;
    }

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 1.0 + uTwinkle * sin(uTime * (0.6 + aSeed * 1.7) + aSeed * 31.4);
    gl_PointSize = clamp(uSize * aSize * uPixelRatio / max(0.0001, -mv.z), 0.6, 48.0);
    vColor = aColor;
    vBright = aBright * tw * uFade * life;
  }
`;

/** Additive star: hot core plus exponential halo. */
export const starFrag = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vBright;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float core = pow(max(0.0, 1.0 - d * 2.55), 7.0);
    float halo = exp(-d * 8.5) * 0.34;
    float a = (core + halo) * vBright;
    if (a < 0.002) discard;
    gl_FragColor = vec4(vColor * (0.6 + core * 1.9), a);
    #include <colorspace_fragment>
  }
`;

/** Subtractive dust lanes: output is absorption, so it only removes light. */
export const dustFrag = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vBright;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float a = exp(-d * d * 14.0) * vBright;
    gl_FragColor = vec4(vColor * a, 1.0);
  }
`;

export const quadVert = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Domain-warped fBm smoke: gold or violet. */
export const nebulaFrag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3 uTint;
  uniform vec3 uTint2;
  uniform float uIntensity;
  uniform float uSeed;
  uniform float uScale;
  varying vec2 vUv;
  ${NOISE}
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float mask = 1.0 - smoothstep(0.15, 1.0, length(p));
    if (mask <= 0.002) discard;
    vec3 q = vec3(p * uScale, uSeed + uTime * 0.012);
    float w = fbm(q * 0.85);
    vec3 q2 = q + vec3(w * 1.6, w * 1.2, w * 0.3);
    float body = pow(clamp(fbm(q2), 0.0, 1.0), 2.4);
    float fil = pow(clamp(fbm(q2 * 2.9), 0.0, 1.0), 4.0) * 0.6;
    float a = (body + fil) * mask * uIntensity;
    if (a < 0.0015) discard;
    gl_FragColor = vec4(mix(uTint, uTint2, clamp(fil * 2.4, 0.0, 1.0)), a);
    #include <colorspace_fragment>
  }
`;

export const worldVert = /* glsl */ `
  precision highp float;
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vWorld;
  void main() {
    vObj = position;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

/**
 * One body shader, five looks (uLook):
 *  0 magma  — basalt with lava cracks (Onyxia's Lair)
 *  1 frost  — ice and slate, a golden world-tree light on the night side (Hyjal)
 *  2 barrow — moss and stone with glowing violet runic veins (Barrow Deeps)
 *  3 river  — green land threaded with bright rivers (Riverglades)
 *  4 sky    — pale banded cloud world (Zephras Isle)
 * The vortex core is the sun, so every terminator faces the crest.
 */
export const worldFrag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uLook;
  uniform float uSeed;
  uniform float uLit;
  uniform vec3 uAtmo;
  uniform vec3 uGlow;
  uniform vec3 uLight;
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vWorld;
  ${NOISE}

  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 L = normalize(uLight - vWorld);
    float ndl = dot(N, L);
    float day = smoothstep(-0.15, 0.45, ndl);
    vec3 o = normalize(vObj) * 2.0 + uSeed;
    float n = fbm(o * 1.6);
    float ridge = 1.0 - abs(fbm(o * 3.1) * 2.0 - 1.0);

    vec3 albedo;
    vec3 emit = vec3(0.0);

    if (uLook < 0.5) {
      albedo = mix(vec3(0.07, 0.045, 0.04), vec3(0.24, 0.15, 0.11), n);
      float crack = smoothstep(0.86, 0.97, ridge);
      emit = uGlow * crack * (1.3 + 0.4 * sin(uTime * 1.7 + n * 9.0));
    } else if (uLook < 1.5) {
      albedo = mix(vec3(0.22, 0.28, 0.38), vec3(0.62, 0.7, 0.8), smoothstep(0.42, 0.62, n));
      float cap = smoothstep(0.55, 0.85, abs(normalize(vObj).y));
      albedo = mix(albedo, vec3(0.78, 0.84, 0.9), cap);
      vec3 treeDir = normalize(vec3(-0.4, 0.55, 0.7));
      float tree = pow(max(0.0, dot(normalize(vObj), treeDir)), 140.0);
      emit = uGlow * tree * 4.0;
    } else if (uLook < 2.5) {
      albedo = mix(vec3(0.05, 0.09, 0.08), vec3(0.16, 0.24, 0.2), n);
      float vein = smoothstep(0.9, 0.985, ridge);
      emit = mix(uGlow, vec3(0.55, 0.3, 1.0), step(0.5, fract(n * 3.0))) * vein * (1.0 + 0.5 * sin(uTime * 2.3 + n * 12.0));
    } else if (uLook < 3.5) {
      albedo = mix(vec3(0.05, 0.16, 0.1), vec3(0.24, 0.36, 0.18), n);
      float river = smoothstep(0.93, 0.99, ridge);
      albedo = mix(albedo, vec3(0.2, 0.55, 0.62), river);
      emit = uGlow * river * 0.35;
    } else {
      float band = sin(normalize(vObj).y * 9.0 + n * 3.5 + uTime * 0.05) * 0.5 + 0.5;
      albedo = mix(vec3(0.32, 0.28, 0.48), vec3(0.62, 0.6, 0.72), band);
    }

    vec3 col = albedo * (0.05 + day * 0.85);
    col += emit * (0.35 + 0.65 * (1.0 - day));
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
    col += uAtmo * fres * (0.35 + 0.9 * day + uLit * 1.4);
    col *= 1.0 + uLit * 0.35;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Ring geometry is flat in XY; vUv.x carries 0..1 across its width. */
export const ringVert = /* glsl */ `
  precision highp float;
  uniform float uInner;
  uniform float uOuter;
  varying vec2 vUv;
  void main() {
    vUv = vec2((length(position.xy) - uInner) / (uOuter - uInner), 0.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Banded additive ring. */
export const ringFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uLit;
  varying vec2 vUv;
  void main() {
    float r = vUv.x;
    float bands = 0.6 + 0.4 * sin(r * 26.0) * sin(r * 9.0 + 1.3);
    float edge = smoothstep(0.0, 0.12, r) * (1.0 - smoothstep(0.82, 1.0, r));
    float a = bands * edge * (0.14 + uLit * 0.3);
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;
