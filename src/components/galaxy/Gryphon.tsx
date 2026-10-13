"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { flight } from "./store";

/**
 * The mount: an original gryphon (lion body, eagle fore-quarters, gold-edged
 * violet-black wings, the crest's mismatched gold/violet eyes) carrying an
 * armoured rider in heavy plate with oversized spiked pauldrons, a crested
 * helm, a cape and a greatsword. Built procedurally — no external assets.
 * Faces +Z. Wings beat in flight and settle into a glide when circling.
 */

function wingShape(side: 1 | -1) {
  // a broad eagle wing: arched leading edge, five splayed primaries
  const s = new THREE.Shape();
  const x = (v: number) => v * side;
  s.moveTo(0, 0.32);
  s.bezierCurveTo(x(0.5), 0.55, x(1.2), 0.6, x(1.75), 0.42);
  s.lineTo(x(2.25), 0.18);
  s.lineTo(x(2.05), 0.06);
  s.lineTo(x(2.2), -0.08);
  s.lineTo(x(1.92), -0.12);
  s.lineTo(x(2.02), -0.3);
  s.lineTo(x(1.72), -0.28);
  s.lineTo(x(1.72), -0.48);
  s.lineTo(x(1.45), -0.4);
  s.lineTo(x(1.38), -0.6);
  s.bezierCurveTo(x(1.0), -0.55, x(0.5), -0.5, 0, -0.36);
  s.lineTo(0, 0.32);
  return new THREE.ShapeGeometry(s, 16);
}

function tailGeometry() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.02, -0.62),
    new THREE.Vector3(0, -0.05, -1.05),
    new THREE.Vector3(0, 0.12, -1.45),
    new THREE.Vector3(0, 0.38, -1.7),
  ]);
  return new THREE.TubeGeometry(curve, 24, 0.045, 6, false);
}

export function Gryphon() {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const cape = useRef<THREE.Mesh>(null);
  const head = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const beat = useRef(0);

  const geo = useMemo(() => ({ wl: wingShape(-1), wr: wingShape(1), tail: tailGeometry() }), []);
  const m = useMemo(() => {
    const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ flatShading: true, ...o });
    return {
      fur: std({ color: "#9a6b2c", roughness: 0.75, emissive: "#2a1606", emissiveIntensity: 0.35 }),
      ruff: std({ color: "#e2cfa0", roughness: 0.7, emissive: "#3a2c14", emissiveIntensity: 0.3 }),
      // feathers win the depth test against the gold layer beneath, so the gold
      // only shows as a rim around the wing, from above or below
      wing: std({ color: "#221830", roughness: 0.45, metalness: 0.25, emissive: "#2c1258", emissiveIntensity: 0.55, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
      wingEdge: std({ color: "#c99a3c", roughness: 0.3, metalness: 0.7, emissive: "#4a3008", emissiveIntensity: 0.5, side: THREE.DoubleSide }),
      beak: std({ color: "#c49a3a", roughness: 0.3, metalness: 0.75, emissive: "#3a2408", emissiveIntensity: 0.4 }),
      plate: std({ color: "#2b2836", roughness: 0.28, metalness: 0.9 }),
      gold: std({ color: "#d4a64a", roughness: 0.22, metalness: 0.95, emissive: "#3a2408", emissiveIntensity: 0.5 }),
      cape: std({ color: "#3b1670", roughness: 0.6, emissive: "#1c0838", emissiveIntensity: 0.6, side: THREE.DoubleSide }),
      leather: std({ color: "#3a2416", roughness: 0.8 }),
      rune: new THREE.MeshBasicMaterial({ color: "#b98cff", toneMapped: false }),
      eyeGold: new THREE.MeshBasicMaterial({ color: "#ffd47a", toneMapped: false }),
      eyeVoid: new THREE.MeshBasicMaterial({ color: "#c9a2ff", toneMapped: false }),
      visor: new THREE.MeshBasicMaterial({ color: "#ffcf73", toneMapped: false }),
      blade: new THREE.MeshBasicMaterial({ color: "#a774ff", toneMapped: false }),
    };
  }, []);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 15);
    const flying = flight.t < 1;
    // strong beats in flight, a slow soaring glide while circling
    beat.current = THREE.MathUtils.damp(beat.current, flying ? 1 : 0.25, 2.5, dt);
    phase.current += dt * (3.2 + beat.current * 4.2);
    const amp = 0.18 + beat.current * 0.62;
    const a = Math.sin(phase.current) * amp + 0.08;
    // the tip lags the root a little: drop the wing slightly on the downstroke
    if (left.current) {
      left.current.rotation.z = -a;
      left.current.rotation.x = Math.cos(phase.current) * 0.08 * beat.current;
    }
    if (right.current) {
      right.current.rotation.z = a;
      right.current.rotation.x = Math.cos(phase.current) * 0.08 * beat.current;
    }
    if (cape.current) cape.current.rotation.x = 0.55 + beat.current * 0.45 + Math.sin(state.clock.elapsedTime * 7) * 0.06;
    if (head.current) head.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.12;
  });

  return (
    <group>
      {/* —— gryphon —— */}
      <mesh material={m.fur} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.05]}>
        <capsuleGeometry args={[0.34, 0.95, 6, 12]} />
      </mesh>
      <mesh material={m.ruff} position={[0, 0.06, 0.55]} scale={[1, 0.95, 0.9]}>
        <sphereGeometry args={[0.37, 12, 10]} />
      </mesh>
      <group ref={head} position={[0, 0.42, 0.92]}>
        <mesh material={m.ruff}>
          <sphereGeometry args={[0.23, 12, 10]} />
        </mesh>
        <mesh material={m.beak} position={[0, -0.05, 0.27]} rotation={[Math.PI / 2 + 0.35, 0, 0]}>
          <coneGeometry args={[0.085, 0.3, 8]} />
        </mesh>
        <mesh material={m.eyeGold} position={[-0.115, 0.05, 0.15]}>
          <sphereGeometry args={[0.036, 8, 6]} />
        </mesh>
        <mesh material={m.eyeVoid} position={[0.115, 0.05, 0.15]}>
          <sphereGeometry args={[0.036, 8, 6]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.wingEdge} position={[s * 0.1, 0.2, -0.1]} rotation={[-0.9, 0, s * -0.3]}>
            <coneGeometry args={[0.05, 0.26, 5]} />
          </mesh>
        ))}
      </group>
      {/* eagle forelegs with gold talons, lion hind legs tucked for flight */}
      {[-1, 1].map((s) => (
        <group key={`f${s}`} position={[s * 0.18, -0.3, 0.52]} rotation={[0.9, 0, 0]}>
          <mesh material={m.ruff}>
            <cylinderGeometry args={[0.06, 0.05, 0.42, 6]} />
          </mesh>
          <mesh material={m.beak} position={[0, -0.25, 0.04]} rotation={[0.4, 0, 0]}>
            <coneGeometry args={[0.05, 0.14, 5]} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((s) => (
        <group key={`h${s}`} position={[s * 0.21, -0.26, -0.48]} rotation={[-1.1, 0, 0]}>
          <mesh material={m.fur}>
            <cylinderGeometry args={[0.1, 0.07, 0.5, 6]} />
          </mesh>
          <mesh material={m.fur} position={[0, -0.27, 0]}>
            <sphereGeometry args={[0.08, 8, 6]} />
          </mesh>
        </group>
      ))}
      <mesh geometry={geo.tail} material={m.fur} />
      <mesh material={m.rune} position={[0, 0.42, -1.74]}>
        <sphereGeometry args={[0.08, 8, 6]} />
      </mesh>
      {/* wings, hinged at the shoulders */}
      <group ref={left} position={[-0.26, 0.24, 0.3]}>
        <mesh geometry={geo.wl} material={m.wingEdge} rotation={[Math.PI / 2, 0, 0]} scale={[1.035, 1.05, 1]} />
        <mesh geometry={geo.wl} material={m.wing} rotation={[Math.PI / 2, 0, 0]} />
      </group>
      <group ref={right} position={[0.26, 0.24, 0.3]}>
        <mesh geometry={geo.wr} material={m.wingEdge} rotation={[Math.PI / 2, 0, 0]} scale={[1.035, 1.05, 1]} />
        <mesh geometry={geo.wr} material={m.wing} rotation={[Math.PI / 2, 0, 0]} />
      </group>

      {/* —— rider —— */}
      <group position={[0, 0.36, 0.18]}>
        {/* saddle */}
        <mesh material={m.cape} position={[0, 0, 0]}>
          <boxGeometry args={[0.52, 0.08, 0.62]} />
        </mesh>
        <mesh material={m.gold} position={[0, 0.045, 0]}>
          <boxGeometry args={[0.54, 0.02, 0.64]} />
        </mesh>
        {/* legs */}
        {[-1, 1].map((s) => (
          <mesh key={`l${s}`} material={m.plate} position={[s * 0.22, -0.08, 0.08]} rotation={[0.5, 0, s * 0.25]}>
            <cylinderGeometry args={[0.07, 0.06, 0.42, 6]} />
          </mesh>
        ))}
        {/* torso, leaning into the flight */}
        <group position={[0, 0.3, -0.02]} rotation={[0.28, 0, 0]}>
          <mesh material={m.plate}>
            <boxGeometry args={[0.34, 0.44, 0.24]} />
          </mesh>
          <mesh material={m.gold} position={[0, -0.18, 0]}>
            <torusGeometry args={[0.19, 0.025, 6, 16]} />
          </mesh>
          <mesh material={m.rune} position={[0, 0.06, 0.125]}>
            <boxGeometry args={[0.05, 0.16, 0.01]} />
          </mesh>
          {/* pauldrons: oversized, spiked, rune-ringed */}
          {[-1, 1].map((s) => (
            <group key={`p${s}`} position={[s * 0.27, 0.2, 0]}>
              <mesh material={m.gold} scale={[1.3, 0.85, 1.15]}>
                <sphereGeometry args={[0.17, 10, 8]} />
              </mesh>
              <mesh material={m.rune} rotation={[0, 0, s * 0.5]} scale={[1.3, 1, 1.15]}>
                <torusGeometry args={[0.15, 0.012, 6, 20]} />
              </mesh>
              {[0, 1, 2].map((i) => (
                <mesh key={i} material={m.gold} position={[s * (0.08 + i * 0.05), 0.12 - i * 0.02, -0.06 + i * 0.06]} rotation={[0, 0, s * -(0.5 + i * 0.25)]}>
                  <coneGeometry args={[0.035, 0.22 - i * 0.03, 5]} />
                </mesh>
              ))}
              {/* arms to the reins */}
              <mesh material={m.plate} position={[s * 0.02, -0.18, 0.12]} rotation={[0.9, 0, 0]}>
                <cylinderGeometry args={[0.05, 0.045, 0.34, 6]} />
              </mesh>
            </group>
          ))}
          {/* helm: crested, horned, glowing visor */}
          <group position={[0, 0.38, 0.02]}>
            <mesh material={m.plate}>
              <sphereGeometry args={[0.13, 10, 8]} />
            </mesh>
            <mesh material={m.gold} position={[0, 0.12, -0.02]}>
              <boxGeometry args={[0.025, 0.12, 0.26]} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={`hn${s}`} material={m.gold} position={[s * 0.11, 0.06, -0.06]} rotation={[-0.9, 0, s * -0.5]}>
                <coneGeometry args={[0.03, 0.22, 5]} />
              </mesh>
            ))}
            <mesh material={m.visor} position={[0, 0.0, 0.122]}>
              <boxGeometry args={[0.15, 0.026, 0.02]} />
            </mesh>
          </group>
          {/* greatsword slung across the back */}
          <group position={[0, 0.1, -0.15]} rotation={[0, 0, 0.75]}>
            <mesh material={m.blade}>
              <boxGeometry args={[0.055, 0.95, 0.018]} />
            </mesh>
            <mesh material={m.gold} position={[0, -0.5, 0]}>
              <boxGeometry args={[0.22, 0.04, 0.04]} />
            </mesh>
          </group>
          {/* cape */}
          <mesh ref={cape} material={m.cape} position={[0, 0.22, -0.14]}>
            <planeGeometry args={[0.46, 0.8, 1, 4]} />
          </mesh>
        </group>
        {/* reins */}
        <mesh material={m.leather} position={[0, 0.16, 0.42]} rotation={[1.2, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.5, 4]} />
        </mesh>
      </group>
    </group>
  );
}
