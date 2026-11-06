"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSettings } from "../settings";

/**
 * The one easing curve, mirrored from the `--ease` token on .lab in weo-lab.css
 * (cubic-bezier(0.2, 0.7, 0.2, 1)): a quick start that settles with no overshoot.
 */
export const EASE: [number, number, number, number] = [0.2, 0.7, 0.2, 1];

/** The three durations in ms, mirrored from --dur-fast, --dur and --dur-slow. */
export const DUR_FAST = 150;
export const DUR = 250;
export const DUR_SLOW = 400;

/** Standard cubic-bezier timing function: solve x(t) = p by Newton steps, then return y(t). */
function bezier([x1, y1, x2, y2]: [number, number, number, number]) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const x = (t: number) => ((ax * t + bx) * t + cx) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const y = (t: number) => ((ay * t + by) * t + cy) * t;
  return (p: number) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < 6; i++) {
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= (x(t) - p) / d;
    }
    return y(Math.min(1, Math.max(0, t)));
  };
}

export const ease = bezier(EASE);

/** One shared MediaQueryList, created on first use (never during SSR). */
let mql: MediaQueryList | null = null;
function query(): MediaQueryList {
  return (mql ??= window.matchMedia("(prefers-reduced-motion: reduce)"));
}
function subscribe(cb: () => void) {
  const mq = query();
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** The system reduced-motion preference, for code outside a hook (e.g. click handlers). */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && query().matches;
}

/** True when the player chose reduced motion in settings or the system asks for it. */
export function useReducedMotion(): boolean {
  const chosen = useSettings((s) => s.reducedMotion);
  const system = useSyncExternalStore(
    subscribe,
    () => query().matches,
    () => false,
  );
  return chosen || system;
}

/**
 * A number that eases to `target` whenever it changes, over `duration` ms.
 * With `from`, the first render starts there and counts up to `target`.
 * Reduced motion returns `target` at once.
 */
export function useTween(target: number, duration = DUR, from?: number): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(from ?? target);
  const shown = useRef(from ?? target);

  useEffect(() => {
    if (reduced || !Number.isFinite(target)) {
      shown.current = target;
      return;
    }
    const start = shown.current;
    if (start === target || !Number.isFinite(start)) {
      shown.current = target;
      setValue(target);
      return;
    }
    let raf = 0;
    let t0 = -1;
    const step = (now: number) => {
      if (t0 < 0) t0 = now;
      const p = Math.min(1, (now - t0) / duration);
      const v = p >= 1 ? target : start + (target - start) * ease(p);
      shown.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);

  return reduced ? target : value;
}
