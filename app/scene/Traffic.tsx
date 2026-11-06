"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { selectCurrent, useLab } from "../store";
import { TOP } from "./hexmap";
import { P } from "./palette";
import { commitInstances, placeInstance, primeInstances } from "./shapes";
import { clamp, useSmooth } from "./useSmooth";
import { WORLD } from "./world";

const MAX_CARTS = 14;

/**
 * Trade carts shuttling between the city centre and the districts: busier and
 * faster when the economy runs hot. Two instanced meshes (chassis and load),
 * so the whole fleet costs two draw calls.
 */
export default function Traffic({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const chassis = useRef<THREE.InstancedMesh>(null);
  const loads = useRef<THREE.InstancedMesh>(null);
  // Each road as a polyline with cumulative lengths, so carts move at an even speed.
  const routes = useMemo(
    () =>
      WORLD.roads.map((path) => {
        const pts = path.map(([x, z]) => new THREE.Vector3(x, TOP + 0.02, z));
        const lens = [0];
        for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
        return { pts, lens, total: lens[lens.length - 1] };
      }),
    [],
  );
  const progress = useMemo(() => Float32Array.from({ length: MAX_CARTS }, (_, i) => (i * 0.61) % 2), []);
  const count = clamp(6 + current.growth * 1.2 + current.gap * 0.8, 2, MAX_CARTS);
  const speed = clamp(0.1 + 0.02 * (current.gap + 2), 0.04, 0.2);
  // Carts join or leave the roads one by one rather than all at once.
  const sm = useSmooth({ count, speed }, 1.5, reducedMotion);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const colors = useMemo(() => Array.from({ length: MAX_CARTS }, (_, i) => new THREE.Color(P.cars[i % P.cars.length])), []);
  /** Under reduced motion the carts stand still: the fleet is written once, then only when the count changes. */
  const still = useRef(-1);

  useLayoutEffect(() => {
    primeInstances(chassis.current, P.trunk);
    const l = loads.current;
    primeInstances(l, P.cars[0]);
    if (l) for (let i = 0; i < MAX_CARTS; i++) l.setColorAt(i, colors[i]);
    commitInstances(l);
  }, [colors]);

  useFrame((_, dt) => {
    const c = chassis.current;
    const l = loads.current;
    if (!c || !l) return;
    const n = sm.current.count;
    const v = sm.current.speed;
    if (reducedMotion && still.current === n) return;
    still.current = reducedMotion ? n : -1;
    for (let i = 0; i < MAX_CARTS; i++) {
      const route = routes[i % routes.length];
      if (!reducedMotion) progress[i] = (progress[i] + (dt * v * 4) / Math.max(1, route.total)) % 2;
      // Out and back: 0..1 outbound, 1..2 return.
      const p = progress[i];
      const out = p <= 1;
      const dist = (out ? p : 2 - p) * route.total;
      let seg = 1;
      while (seg < route.lens.length - 1 && route.lens[seg] < dist) seg++;
      const a = route.pts[seg - 1];
      const b = route.pts[seg];
      const t = (dist - route.lens[seg - 1]) / Math.max(1e-6, route.lens[seg] - route.lens[seg - 1]);
      tmp.copy(a).lerp(b, clamp(t, 0, 1));
      // Keep to the right-hand side of the road.
      const dx = (b.x - a.x) * (out ? 1 : -1);
      const dz = (b.z - a.z) * (out ? 1 : -1);
      const len = Math.hypot(dx, dz) || 1;
      const edge = Math.min(dist, route.total - dist);
      // Shrink in at the ends of a road, and out when this cart is not on the roads at all.
      const s = clamp(edge * 2, 0.2, 1) * clamp(n - i, 0, 1);
      const x = tmp.x + (-dz / len) * 0.07;
      const z = tmp.z + (dx / len) * 0.07;
      const rot = Math.atan2(dx, dz);
      placeInstance(c, i, x, tmp.y + 0.07 * s, z, s, s, s, rot);
      placeInstance(l, i, x, tmp.y + 0.15 * s, z, s, s, s, rot);
    }
    commitInstances(c, false);
    commitInstances(l, false);
  });

  return (
    <group>
      <instancedMesh ref={chassis} args={[undefined, undefined, MAX_CARTS]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.15, 0.1, 0.26]} />
        <meshStandardMaterial roughness={0.9} flatShading={P.flat} />
      </instancedMesh>
      <instancedMesh ref={loads} args={[undefined, undefined, MAX_CARTS]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.13, 0.08, 0.2]} />
        <meshStandardMaterial roughness={0.7} flatShading={P.flat} />
      </instancedMesh>
    </group>
  );
}
