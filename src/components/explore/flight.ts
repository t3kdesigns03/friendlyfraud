import * as THREE from "three";

/**
 * Mutable flight state shared by the raven, the camera and the DOM HUD.
 * The scene reads/writes it every frame; the HUD only issues commands.
 */
export const START = new THREE.Vector3(0, 3.2, 15);

export const flight = {
  pos: START.clone(),
  vel: new THREE.Vector3(),
  /** world/crest id we're flying to or circling */
  target: null as string | null,
  mode: "free" as "free" | "travel" | "orbit",
  orbitAngle: 0,
  heading: Math.PI, // facing -z, toward the crest
  bank: 0,
  zoom: 1,
  /** pointer travelled far enough this gesture to count as a flick, not a tap */
  dragged: false,
  calm: false,
};

export function flyTo(id: string | null) {
  if (!id) {
    flight.target = null;
    flight.mode = "travel";
    return;
  }
  flight.target = id;
  flight.mode = "travel";
}

export function flick(dx: number, dy: number, camForward: THREE.Vector3, camRight: THREE.Vector3) {
  // drag up = fly forward, drag sideways = slide that way
  const f = camForward.clone().setY(0).normalize();
  const impulse = f.multiplyScalar(-dy * 0.035).add(camRight.clone().setY(0).normalize().multiplyScalar(dx * 0.03));
  impulse.y = -dy * 0.004;
  flight.vel.add(impulse);
  flight.mode = "free";
  flight.target = null;
}

export function resetFlight() {
  flight.target = null;
  flight.mode = "travel";
  flight.zoom = 1;
}
