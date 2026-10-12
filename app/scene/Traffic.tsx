"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { selectCurrent, useLab } from "../store";
import { TOP } from "./hexmap";
import { P } from "./palette";
import { clamp } from "./useSmooth";
import { WORLD } from "./world";

const MAX_CARTS = 14;

/** Trade carts shuttling between the city centre and the districts: busier and faster when the economy runs hot. */
export default function Traffic({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const carts = useRef<(THREE.Group | null)[]>([]);
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
  const progress = useMemo(() => Array.from({ length: MAX_CARTS }, (_, i) => (i * 0.61) % 2), []);
  const count = Math.round(clamp(6 + current.growth * 1.2 + current.gap * 0.8, 2, MAX_CARTS));
  const speed = clamp(0.1 + 0.02 * (current.gap + 2), 0.04, 0.2);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    for (let i = 0; i < MAX_CARTS; i++) {
      const cart = carts.current[i];
      if (!cart) continue;
      cart.visible = i < count;
      if (!cart.visible) continue;
      const route = routes[i % routes.length];
      if (!reducedMotion) progress[i] = (progress[i] + (dt * speed * 4) / Math.max(1, route.total)) % 2;
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
      cart.position.set(tmp.x + (-dz / len) * 0.07, tmp.y, tmp.z + (dx / len) * 0.07);
      cart.rotation.y = Math.atan2(dx, dz);
      const edge = Math.min(dist, route.total - dist);
      cart.scale.setScalar(clamp(edge * 2, 0.2, 1));
    }
  });

  return (
    <group>
      {Array.from({ length: MAX_CARTS }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            carts.current[i] = el;
          }}
        >
          <mesh position-y={0.07} castShadow>
            <boxGeometry args={[0.15, 0.1, 0.26]} />
            <meshStandardMaterial color={P.trunk} roughness={0.9} flatShading={P.flat} />
          </mesh>
          <mesh position-y={0.15} castShadow>
            <boxGeometry args={[0.13, 0.08, 0.2]} />
            <meshStandardMaterial color={P.cars[i % P.cars.length]} roughness={0.7} flatShading={P.flat} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
