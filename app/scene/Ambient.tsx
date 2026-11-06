"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { P } from "./palette";
import { commitInstances, DUMMY, mixHex, placeInstance, primeInstances, prismGeometry, useGeometry } from "./shapes";
import { clamp } from "./useSmooth";

/** Sailing loops on open water around the island: centre x, centre z, radius. Checked against the hex map. */
const LOOPS: [number, number, number][] = [
  [-3, 15.5, 2.2],
  [-13, 13, 2.0],
  [12, -16, 1.8],
  [-21, -4, 1.8],
];
const BIRDS = 7;

/**
 * Background life: sailing boats tacking slowly around the island and a small
 * flock of gulls circling overhead. It carries no data, so it stays quiet:
 * boats stand still and the gulls stay away when motion is reduced, and the
 * gulls take shelter in a storm.
 */
export default function Ambient({ reducedMotion, storm }: { reducedMotion: boolean; storm: number }) {
  const hulls = useRef<THREE.InstancedMesh>(null);
  const sails = useRef<THREE.InstancedMesh>(null);
  const wings = useRef<THREE.InstancedMesh>(null);
  const sailGeometry = useGeometry(() =>
    prismGeometry(
      [
        [0, 0],
        [0.34, 0],
        [0, 0.62],
      ],
      0.02,
    ),
  );
  const wingGeometry = useGeometry(() => {
    const g = new THREE.BufferGeometry();
    // One gull wing: the inner half rises to an elbow, the outer half sweeps back and down to the tip.
    // prettier-ignore
    g.setAttribute("position", new THREE.Float32BufferAttribute([
      0, 0, 0.045, 0.14, 0.05, 0.015, 0, 0, -0.045,
      0.14, 0.05, 0.03, 0.31, -0.01, -0.08, 0.14, 0.05, -0.03,
    ], 3));
    g.computeVertexNormals();
    return g;
  });
  // Dark enough to read as birds against both land and sea.
  const gull = useMemo(() => mixHex(P.hull, P.stone, 0.3), []);
  const gone = useRef(0);

  useLayoutEffect(() => {
    primeInstances(hulls.current, P.cream);
    primeInstances(sails.current, P.cream);
    primeInstances(wings.current, gull);
    const h = hulls.current;
    if (h) {
      for (let i = 0; i < LOOPS.length; i++) h.setColorAt(i, new THREE.Color(i % 2 ? P.accent : P.bad));
      commitInstances(h);
    }
  }, [gull]);

  useFrame((state, dt) => {
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    const h = hulls.current;
    const s = sails.current;
    if (h && s) {
      for (let i = 0; i < LOOPS.length; i++) {
        const [cx, cz, r] = LOOPS[i];
        const dir = i % 2 ? 1 : -1;
        const a = i * 1.9 + dir * t * 0.05;
        const x = cx + Math.cos(a) * r;
        const z = cz + Math.sin(a) * r;
        // Heading along the tangent of the loop.
        const heading = Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir);
        const bob = reducedMotion ? 0 : Math.sin(t * 1.4 + i) * 0.03;
        placeInstance(h, i, x, 0.02 + bob, z, 1, 1, 1, heading);
        DUMMY.position.set(x, 0.1 + bob, z);
        // The sail trails back from the mast and heels a little in the wind.
        DUMMY.rotation.set(reducedMotion ? 0 : Math.sin(t * 0.9 + i) * 0.06, heading + Math.PI / 2, 0, "YXZ");
        DUMMY.scale.set(1, 1, 1);
        DUMMY.updateMatrix();
        s.setMatrixAt(i, DUMMY.matrix);
      }
      commitInstances(h, false);
      commitInstances(s, false);
    }

    const w = wings.current;
    if (!w) return;
    // The flock fades out in a storm and is not shown at all with reduced motion.
    const target = reducedMotion ? 0 : clamp(1 - storm * 1.6, 0, 1);
    gone.current += (target - gone.current) * Math.min(1, dt * 1.5);
    const show = gone.current;
    const lead = t * 0.045;
    // A wide loop over the coast, so the flock rarely crosses a district.
    const fx = Math.cos(lead) * 15;
    const fz = Math.sin(lead) * 12;
    // Flying anticlockwise: forward is the tangent of the circle.
    const yaw = Math.atan2(-Math.sin(lead) * 15, Math.cos(lead) * 12);
    const fwdX = Math.sin(yaw);
    const fwdZ = Math.cos(yaw);
    for (let b = 0; b < BIRDS; b++) {
      // A loose V: birds trail behind and to either side of the leader.
      const rank = Math.ceil(b / 2);
      const side = b === 0 ? 0 : b % 2 ? 1 : -1;
      const back = rank * 0.55;
      const across = side * rank * 0.5;
      const x = fx - fwdX * back + fwdZ * across;
      const z = fz - fwdZ * back - fwdX * across;
      const y = 8.5 + Math.sin(t * 0.6 + b) * 0.25 - rank * 0.05;
      const flap = Math.sin(t * 7 + b * 1.3) * 0.45;
      const k = show > 0.01 ? show : 0;
      for (let side2 = 0; side2 < 2; side2++) {
        DUMMY.position.set(x, y, z);
        DUMMY.rotation.set(0, yaw, side2 ? -flap : flap, "YXZ");
        DUMMY.scale.set(side2 ? -k : k, k, k);
        DUMMY.updateMatrix();
        w.setMatrixAt(b * 2 + side2, DUMMY.matrix);
      }
    }
    commitInstances(w, false);
  });

  return (
    <group>
      <instancedMesh ref={hulls} args={[undefined, undefined, LOOPS.length]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.24, 0.12, 0.66]} />
        <meshStandardMaterial roughness={0.8} flatShading />
      </instancedMesh>
      <instancedMesh ref={sails} args={[sailGeometry, undefined, LOOPS.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial color={P.cream} roughness={0.9} side={THREE.DoubleSide} flatShading />
      </instancedMesh>
      <instancedMesh ref={wings} args={[wingGeometry, undefined, BIRDS * 2]} frustumCulled={false}>
        <meshStandardMaterial roughness={1} side={THREE.DoubleSide} flatShading />
      </instancedMesh>
    </group>
  );
}
