import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * Low-poly helpers shared by the island's models: prisms for roofs and bows,
 * and scratch objects for writing instance matrices without allocating.
 */

/** A prism whose cross-section is `points` in the x-y plane, extruded `depth` along z and centred on z. */
export function prismGeometry(points: [number, number][], depth: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** A geometry made once per mount and disposed on unmount. */
export function useGeometry(make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  const g = useMemo(make, []);
  useEffect(() => () => g.dispose(), [g]);
  return g;
}

/** Gable roof: ridge along z, eaves `w` wide and `h` tall. */
export const gableRoof = (w: number, h: number, depth: number) =>
  prismGeometry(
    [
      [-w / 2, 0],
      [w / 2, 0],
      [0, h],
    ],
    depth,
  );

/** Scratch object for instance matrices. Only touched inside useFrame and layout effects. */
export const DUMMY = new THREE.Object3D();
/** Scratch colour. */
export const TMP_COLOR = new THREE.Color();

/** Hide every instance (zero scale) and give it a colour, so the colour buffer exists before the first render. */
export function primeInstances(mesh: THREE.InstancedMesh | null, color: THREE.Color | string) {
  if (!mesh) return;
  TMP_COLOR.set(color);
  DUMMY.position.set(0, 0, 0);
  DUMMY.rotation.set(0, 0, 0);
  DUMMY.scale.setScalar(0);
  DUMMY.updateMatrix();
  for (let i = 0; i < mesh.count; i++) {
    mesh.setMatrixAt(i, DUMMY.matrix);
    mesh.setColorAt(i, TMP_COLOR);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/** Write one instance's transform from position, uniform-or-xyz scale and a y rotation. */
export function placeInstance(mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, rotY = 0) {
  DUMMY.position.set(x, y, z);
  DUMMY.rotation.set(0, rotY, 0);
  DUMMY.scale.set(sx, sy, sz);
  DUMMY.updateMatrix();
  mesh.setMatrixAt(i, DUMMY.matrix);
}

/** Blend two hex colours into a hex string (render-time only). */
export const mixHex = (a: string, b: string, t: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

/** A fixed pseudo-random order in [0, 1) for `n` items, so things light up or go dark scattered, not in rows. */
export function scatterOrder(n: number, seed = 7): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = ((i * seed + 3) % n) / n;
  return out;
}

/** Flag an instanced mesh's matrices and colours for upload. */
export function commitInstances(mesh: THREE.InstancedMesh | null, colors = true) {
  if (!mesh) return;
  mesh.instanceMatrix.needsUpdate = true;
  if (colors && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}
