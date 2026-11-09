"use client";

import { P } from "./palette";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useGeometry } from "./shapes";

/**
 * Low-poly sea: a faceted plane whose vertices bob on a few crossing waves (sines of the
 * clock, so the motion never loops back with a seam), with a calm outer plane that the fog
 * swallows at the horizon. Everything a vertex needs that does not change with time is
 * worked out once, so each frame is three sines per vertex and allocates nothing. A storm
 * raises the swell gradually. With reduced motion the sea lies flat and still.
 */
export default function Water({ reducedMotion, choppy }: { reducedMotion: boolean; choppy: number }) {
  const geometry = useGeometry(() => {
    const g = new THREE.PlaneGeometry(110, 110, 72, 72);
    g.rotateX(-Math.PI / 2);
    return g;
  });
  const waves = useMemo(() => {
    const p = geometry.attributes.position.array as Float32Array;
    const n = p.length / 3;
    const fade = new Float32Array(n);
    const a = new Float32Array(n);
    const b = new Float32Array(n);
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = p[i * 3];
      const z = p[i * 3 + 2];
      // Calm water near the shore, more swell further out.
      fade[i] = 0.25 + 0.75 * Math.min(1, Math.max(0, (Math.sqrt(x * x + z * z) - 14) / 12));
      a[i] = x * 0.45;
      b[i] = z * 0.38;
      c[i] = (x + z) * 0.9;
    }
    return { n, fade, a, b, c };
  }, [geometry]);
  const amp = useRef(0.04 + 0.12 * choppy);

  useFrame((state, dt) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    amp.current += (0.04 + 0.12 * choppy - amp.current) * Math.min(1, dt * 0.8);
    const k = amp.current;
    const { n, fade, a, b, c } = waves;
    const s1 = t * 1.1;
    const s2 = t * 0.9;
    const s3 = t * 1.7;
    for (let i = 0; i < n; i++) arr[i * 3 + 1] = fade[i] * k * (Math.sin(a[i] + s1) + Math.cos(b[i] - s2) * 0.8 + Math.sin(c[i] + s3) * 0.35);
    pos.needsUpdate = true;
  });

  return (
    <group>
      {/* Translucent swell over the hex sea tiles, so their shallow and deep colours show through. */}
      <mesh geometry={geometry} position-y={0.0}>
        <meshStandardMaterial color={P.water} roughness={0.25} metalness={0.1} transparent opacity={0.42} flatShading depthWrite={false} />
      </mesh>
      {/* Open ocean beyond the map. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.3}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={P.deep} roughness={0.6} />
      </mesh>
    </group>
  );
}
