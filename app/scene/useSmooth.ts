"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";

/** True when the viewer prefers reduced motion. Read inside the canvas, where no React context is needed. */
export function useReducedMotionFlag(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Keeps a mutable copy of numeric targets that eases toward them every frame.
 * Consumers read `ref.current` inside their own useFrame.
 */
export function useSmooth<T extends Record<string, number>>(targets: T, speed = 4, instant = false) {
  const ref = useRef<T>({ ...targets });
  const targetRef = useRef<T>(targets);
  targetRef.current = targets;
  useFrame((_, dt) => {
    const k = instant ? 1 : Math.min(1, dt * speed);
    const cur = ref.current;
    const tgt = targetRef.current;
    for (const key of Object.keys(tgt) as (keyof T)[]) {
      const next = tgt[key];
      const now = cur[key];
      const v = now + (next - now) * k;
      cur[key] = (Math.abs(next - v) < 1e-4 ? next : v) as T[keyof T];
    }
  });
  return ref;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
