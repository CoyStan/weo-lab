"use client";

// One requestAnimationFrame loop for every moving part of the machine. It
// stops while the tab is hidden and when nothing is subscribed, and parts only
// write to the DOM (dash offsets, transforms), never read layout.

import { useEffect, useRef, useState } from "react";
import { useLab } from "../../store";

type Tick = (dt: number) => void;
const ticks = new Set<Tick>();
let raf = 0;
let last = 0;

function loop(now: number) {
  if (document.hidden || !ticks.size) {
    raf = 0;
    return;
  }
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  for (const f of ticks) f(dt);
  raf = requestAnimationFrame(loop);
}

function kick() {
  if (raf || !ticks.size || typeof document === "undefined" || document.hidden) return;
  last = performance.now();
  raf = requestAnimationFrame(loop);
}

if (typeof document !== "undefined") document.addEventListener("visibilitychange", kick);

/** Calls fn every frame (with seconds since the last frame) while `active`. */
export function useTick(fn: Tick, active: boolean) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    const f: Tick = (dt) => ref.current(dt);
    ticks.add(f);
    kick();
    return () => {
      ticks.delete(f);
    };
  }, [active]);
}

/** Reduced motion: the viewer's system setting or the game's own switch. */
export function useReduced(): boolean {
  const forced = useLab((s) => s.reduceMotion);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced || forced;
}

/** True while the tab is hidden, so CSS loops can pause too. */
export function useHidden(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return hidden;
}
