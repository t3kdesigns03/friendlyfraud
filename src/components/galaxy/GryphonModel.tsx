"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { flight } from "./store";

/**
 * The mount: "Gryphon Rigged and Animated" by DreamNoms (CC-BY-4.0, credited
 * on /explore and in the README) carrying an armoured knight (KayKit
 * Adventurers, CC0). Feathers are regraded into the crest's violet and gold
 * with a soft rim light so the silhouette reads against space.
 *
 * The source file's baked clip and node rest pose don't agree with its own
 * skin bind data in three.js (and one wing is bound off to the side), so the
 * rig is driven here instead: every joint is posed from its inverse bind
 * matrix, so the mesh renders exactly as modelled, and flight motion is
 * applied as rotations about joint pivots in mesh space. The good wing is
 * mirrored to make the other one.
 *
 * Faces +Z, roughly 4.6 units wingtip to wingtip. Beats its wings while
 * travelling, settles into a glide while circling.
 */

export const GRYPHON_URL = "/models/gryphon.glb";
export const KNIGHT_URL = "/models/knight.glb";

/** mesh units → scene units */
const SCALE = 0.075;
/** the rider's seat, in mount space */
const SEAT = { pos: new THREE.Vector3(0, -0.5, 0.5), scale: 0.3, lean: 0.1 };

const GOLD = new THREE.Color("#f2c25a");
const VIOLET = new THREE.Color("#5b2bb8");

type Shader = Parameters<NonNullable<THREE.Material["onBeforeCompile"]>>[0];

const RIM = `float fres = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 2.5);
        outgoingLight += uRim * fres * uRimK;
        #include <opaque_fragment>`;

/**
 * Regrade a textured material: its luminance drives a dark → light ramp
 * (violet into gold, the crest's two halves), plus a fresnel rim.
 */
function regrade(m: THREE.MeshStandardMaterial, low: THREE.Color, high: THREE.Color, rim: THREE.Color, k: number) {
  m.onBeforeCompile = (s: Shader) => {
    Object.assign(s.uniforms, { uLow: { value: low }, uHigh: { value: high }, uRim: { value: rim }, uRimK: { value: k } });
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uLow; uniform vec3 uHigh; uniform vec3 uRim; uniform float uRimK;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = mix(uLow, uHigh, smoothstep(0.12, 0.62, lum));`,
      )
      .replace("#include <opaque_fragment>", RIM);
  };
  m.customProgramCacheKey = () => `regrade-${low.getHexString()}-${high.getHexString()}-${rim.getHexString()}-${k}`;
}

/** fresnel rim only */
function rim(m: THREE.MeshStandardMaterial, color: THREE.Color, k: number) {
  m.onBeforeCompile = (s: Shader) => {
    Object.assign(s.uniforms, { uRim: { value: color }, uRimK: { value: k } });
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uRim; uniform float uRimK;")
      .replace("#include <opaque_fragment>", RIM);
  };
  m.customProgramCacheKey = () => `rim-${color.getHexString()}-${k}`;
}

function dressGryphon(m: THREE.MeshStandardMaterial) {
  const rimViolet = new THREE.Color("#9b6bff");
  const rimGold = new THREE.Color("#ffcf7a");
  m.envMapIntensity = 1.2;
  switch (m.name) {
    case "Material": // upper wing: white band + brown coverts
    case "LayeringBack":
      regrade(m, new THREE.Color("#2a1252"), GOLD, rimViolet, 0.9);
      m.roughness = 0.55;
      m.metalness = 0.15;
      m.side = THREE.DoubleSide;
      break;
    case "WingBack": // underside
      regrade(m, new THREE.Color("#1a0b36"), VIOLET, rimViolet, 0.8);
      m.roughness = 0.6;
      m.side = THREE.DoubleSide;
      break;
    case "Brown": // lion body
      m.color.set("#8a5a22");
      m.roughness = 0.6;
      rim(m, rimGold, 0.7);
      break;
    case "White": // eagle head and chest
      m.color.set("#f3ead8");
      m.roughness = 0.5;
      rim(m, rimViolet, 0.55);
      break;
    case "Beak":
    case "Talons":
      m.color.set("#f0b640");
      m.metalness = 0.6;
      m.roughness = 0.3;
      break;
  }
}

function dressKnight(knight: THREE.Object3D) {
  const hide = /Shield|Sword|1H_|2H_/;
  knight.traverse((o) => {
    if (hide.test(o.name)) o.visible = false;
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    const m = (mesh.material as THREE.MeshStandardMaterial).clone();
    m.envMapIntensity = 1.4;
    if (/Cape/.test(o.name)) {
      regrade(m, new THREE.Color("#2a0f5c"), new THREE.Color("#7b3cf0"), new THREE.Color("#b88cff"), 0.8);
    } else {
      m.metalness = 0.55;
      m.roughness = 0.38;
      rim(m, new THREE.Color("#ffcf7a"), 0.6);
    }
    mesh.material = m;
  });
}

// —— rig ——————————————————————————————————————————————————————————————

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
/** mirror across the sagittal plane (mesh space) */
const S = new THREE.Matrix4().makeScale(-1, 1, 1);
/** the modelled wing root sits low on the chest; lift it to the shoulders (mesh units) */
const WING_ROOT = new THREE.Matrix4().makeTranslation(-4.4, 3.0, -3.6);

type Rig = {
  root: THREE.Group;
  bones: THREE.Bone[];
  bind: THREE.Matrix4[];
  /** each joint's pivot in mesh space */
  pivot: THREE.Vector3[];
  /** parent joint for the procedural chain (−1 = body) */
  parent: number[];
  /** per-joint deformation in mesh space, rebuilt every frame */
  K: THREE.Matrix4[];
  /** joint indices by short name ("WingBaseL", "Tail1001", …) */
  j: Record<string, number>;
  /** mirrored wing: its joints follow S·K·S of the source wing */
  mirror: [number, number][];
};

const short = (name: string) => name.replace("_CatArmature", "");

function buildRig(scene: THREE.Object3D): Rig {
  const src = clone(scene);
  src.updateMatrixWorld(true);
  const skinned: THREE.SkinnedMesh[] = [];
  src.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned.push(o as THREE.SkinnedMesh);
    // loose eye/claw props hang off joints in a pose this rig doesn't use
    else if ((o as THREE.Mesh).isMesh) o.visible = false;
  });
  const skeleton = skinned[0].skeleton;
  const bones = skeleton.bones;
  const j: Record<string, number> = {};
  bones.forEach((b, i) => (j[short(b.name)] = i));
  const bind = skeleton.boneInverses.map((m) => m.clone().invert());

  const root = new THREE.Group();
  // joints sit flat under the root; their matrices are written directly
  for (const b of bones) {
    root.add(b);
    b.matrixAutoUpdate = false;
  }

  // dominant joint per vertex → per-joint vertex clouds (mesh space)
  const clouds: THREE.Vector3[][] = bones.map(() => []);
  const geomOf = (mesh: THREE.SkinnedMesh) => mesh.geometry as THREE.BufferGeometry;
  for (const mesh of skinned) {
    const g = geomOf(mesh);
    const pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    for (let v = 0; v < pos.count; v++) {
      let best = 0;
      for (let k = 1; k < 4; k++) if (sw.getComponent(v, k) > sw.getComponent(v, best)) best = k;
      clouds[si.getComponent(v, best)].push(new THREE.Vector3().fromBufferAttribute(pos, v));
    }
  }
  /** centroid of the 12% of a joint's vertices that score lowest on `key` */
  const edge = (i: number, key: (p: THREE.Vector3) => number) => {
    const c = [...clouds[i]].sort((a, b) => key(a) - key(b));
    const n = Math.max(1, Math.round(c.length * 0.12));
    return c.slice(0, n).reduce((acc, p) => acc.add(p), new THREE.Vector3()).divideScalar(n);
  };

  // the procedural hierarchy (IK helpers ride on the limb they drive)
  const parent = bones.map(() => -1);
  const link = (child: string, par: string) => (parent[j[child]] = j[par]);
  link("WingArmL", "WingBaseL");
  link("WingTipL", "WingArmL");
  link("WingArmR", "WingBaseR");
  link("WingTipR", "WingArmR");
  for (const s of ["L", "R"]) {
    link(`Shoulder2${s}`, `Shoulder${s}`);
    link(`UpperArm${s}`, `Shoulder2${s}`);
    link(`Arm${s}`, `UpperArm${s}`);
    link(`LegFrontIK${s}`, `Arm${s}`);
    link(`Thigh${s}`, `Hip${s}`);
    link(`Knee${s}`, `Thigh${s}`);
    link(`Ankle${s}`, `Knee${s}`);
    link(`Foot${s}`, `Ankle${s}`);
  }
  const tail = ["Tail1", "Tail1001", "Tail1004", "Tail1002", "Tail1005", "Tail1003"];
  for (let k = 1; k < tail.length; k++) link(tail[k], tail[k - 1]);
  link("Head", "Neck");

  const pivot = bones.map((_, i) => (clouds[i].length ? edge(i, (p) => -p.y) : new THREE.Vector3()));
  for (const n of ["WingBaseL", "WingArmL", "WingTipL"]) pivot[j[n]] = edge(j[n], (p) => p.x);
  for (const n of tail) if (clouds[j[n]].length) pivot[j[n]] = edge(j[n], (p) => -p.z);
  for (const n of ["Neck", "Head"]) pivot[j[n]] = edge(j[n], (p) => p.z);
  for (const s of ["L", "R"]) {
    // the IK paws pivot with their limb
    pivot[j[`LegFrontIK${s}`]] = pivot[j[`Arm${s}`]].clone();
    pivot[j[`Foot${s}`]] = pivot[j[`Ankle${s}`]].clone();
  }

  // mirror the good wing (bound to the L chain) onto the R chain; drop the mis-bound one
  const remap = new Map([
    [j.WingBaseL, j.WingBaseR],
    [j.WingArmL, j.WingArmR],
    [j.WingTipL, j.WingTipR],
  ]);
  const usesL = (mesh: THREE.SkinnedMesh) => {
    const si = geomOf(mesh).attributes.skinIndex;
    return si.getX(0) === j.WingBaseL || si.getX(0) === j.WingArmL || si.getX(0) === j.WingTipL;
  };
  const usesR = (mesh: THREE.SkinnedMesh) => {
    const si = geomOf(mesh).attributes.skinIndex;
    return [...remap.values()].includes(si.getX(0));
  };
  const meshes: THREE.SkinnedMesh[] = [];
  for (const mesh of skinned) {
    if (usesR(mesh)) continue;
    meshes.push(mesh);
    if (!usesL(mesh)) continue;
    const g = geomOf(mesh).clone();
    const p = g.attributes.position as THREE.BufferAttribute;
    const nrm = g.attributes.normal as THREE.BufferAttribute;
    for (let v = 0; v < p.count; v++) {
      p.setX(v, -p.getX(v));
      if (nrm) nrm.setX(v, -nrm.getX(v));
    }
    const si = g.attributes.skinIndex as THREE.BufferAttribute;
    for (let v = 0; v < si.count; v++) for (let k = 0; k < 4; k++) si.setComponent(v, k, remap.get(si.getComponent(v, k)) ?? si.getComponent(v, k));
    if (g.index) {
      const idx = g.index.array;
      for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
    }
    const twin = new THREE.SkinnedMesh(g, mesh.material);
    twin.name = `${mesh.name}_mirror`;
    meshes.push(twin);
  }
  for (const mesh of meshes) {
    root.add(mesh);
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    mesh.frustumCulled = false;
    mesh.bind(skeleton, new THREE.Matrix4());
    const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
    dressGryphon(mat);
    mesh.material = mat;
  }

  return {
    root,
    bones,
    bind,
    pivot,
    parent,
    K: bones.map(() => new THREE.Matrix4()),
    j,
    mirror: [...remap.entries()],
  };
}

const _t = new THREE.Matrix4();
const _r = new THREE.Matrix4();
const _q = new THREE.Quaternion();

/** K[i] = K[parent] · T(p) · R · T(−p) */
function pose(rig: Rig, i: number, rot: THREE.Quaternion) {
  const p = rig.pivot[i];
  const par = rig.parent[i];
  const K = rig.K[i];
  if (par >= 0) K.copy(rig.K[par]);
  else K.identity();
  K.multiply(_t.makeTranslation(p.x, p.y, p.z)).multiply(_r.makeRotationFromQuaternion(rot)).multiply(_t.makeTranslation(-p.x, -p.y, -p.z));
}

const rotQ = (out: THREE.Quaternion, ...steps: [THREE.Vector3, number][]) => {
  out.identity();
  for (const [axis, a] of steps) out.premultiply(_q.setFromAxisAngle(axis, a));
  return out;
};

export function GryphonModel() {
  const gry = useGLTF(GRYPHON_URL);
  const kn = useGLTF(KNIGHT_URL);

  const { rig, knight, kMixer, state } = useMemo(() => {
    const rig = buildRig(gry.scene);
    const knight = clone(kn.scene);
    dressKnight(knight);
    const kMixer = new THREE.AnimationMixer(knight);
    const sit = kn.animations.find((a) => a.name === "Sit_Chair_Idle") ?? kn.animations[0];
    if (sit) kMixer.clipAction(sit).play();
    return { rig, knight, kMixer, state: { flap: 1, phase: 0 } };
  }, [gry, kn]);

  useFrame((clock, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 15);
    const t = clock.clock.elapsedTime;
    const { j } = rig;
    // flap while travelling, glide while circling
    state.flap = THREE.MathUtils.damp(state.flap, flight.t < 1 ? 1 : 0, 2.2, dt);
    state.phase += dt * THREE.MathUtils.lerp(1.1, 5.6, state.flap);
    const f = state.flap;
    const s = Math.sin(state.phase);
    const lag = Math.sin(state.phase - 0.9);
    const lag2 = Math.sin(state.phase - 1.6);
    const q = new THREE.Quaternion();

    for (let i = 0; i < rig.K.length; i++) rig.K[i].identity();

    // wings: lay the modelled (hanging) wing flat, then beat about the body's long axis
    const beat = THREE.MathUtils.lerp(0.06, 0.62, f);
    // (the wing is modelled hanging, upper face forward: tip it back, roll it face-up)
    pose(rig, j.WingBaseL, rotQ(q, [X, Math.PI / 2], [Z, Math.PI - 0.12 - s * beat]));
    rig.K[j.WingBaseL].premultiply(WING_ROOT); // up onto the shoulders
    pose(rig, j.WingArmL, rotQ(q, [Y, -lag * beat * 0.55]));
    pose(rig, j.WingTipL, rotQ(q, [Y, -(lag2 * beat * 0.45) + 0.05]));

    // legs tucked back for flight, with a little drag in the beat
    for (const side of ["L", "R"]) {
      pose(rig, j[`Shoulder2${side}`], rotQ(q, [X, 1.3 + s * 0.05 * f]));
      pose(rig, j[`UpperArm${side}`], rotQ(q, [X, 0.3]));
      pose(rig, j[`Arm${side}`], rotQ(q, [X, 0.6]));
      pose(rig, j[`LegFrontIK${side}`], rotQ(q));
      pose(rig, j[`Thigh${side}`], rotQ(q, [X, 1.3 + lag * 0.05 * f]));
      pose(rig, j[`Knee${side}`], rotQ(q, [X, 0.35]));
      pose(rig, j[`Ankle${side}`], rotQ(q, [X, 0.2]));
      pose(rig, j[`Foot${side}`], rotQ(q));
    }

    // tail streams behind, swaying; head counters the beat
    const tail = ["Tail1", "Tail1001", "Tail1004", "Tail1002", "Tail1005", "Tail1003"];
    tail.forEach((n, k) => pose(rig, j[n], rotQ(q, [X, (k === 0 ? -0.5 : 0.12) + Math.sin(t * 1.3 - k * 0.6) * 0.06], [Y, Math.sin(t * 0.9 - k * 0.5) * 0.08])));
    pose(rig, j.Neck, rotQ(q, [X, -0.1 - s * 0.04 * f]));
    pose(rig, j.Head, rotQ(q, [X, 0.15 + s * 0.05 * f]));

    // the mirrored wing follows S·K·S
    for (const [l, r] of rig.mirror) rig.K[r].copy(S).multiply(rig.K[l]).multiply(S);

    // joint matrix = K · bind (the skin then resolves to K · v)
    for (let i = 0; i < rig.bones.length; i++) {
      const b = rig.bones[i];
      b.matrix.multiplyMatrices(rig.K[i], rig.bind[i]);
      b.matrixWorldNeedsUpdate = true;
    }
    kMixer.update(dt);
  });

  return (
    // lift so the flight point sits mid-body
    <group position={[0, 0.35, 0]}>
      <group scale={SCALE}>
        <primitive object={rig.root} />
      </group>
      <group position={SEAT.pos} rotation={[SEAT.lean, 0, 0]} scale={SEAT.scale}>
        <primitive object={knight} />
      </group>
    </group>
  );
}

useGLTF.preload(GRYPHON_URL);
useGLTF.preload(KNIGHT_URL);
