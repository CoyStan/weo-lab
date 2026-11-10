// A tiny animation store: named numbers that chase their targets each frame.
// Most ease out (exponential approach); some move at a steady rate (arrows
// drawing, the strip's travelling marker). A key can hold still until a delay
// has passed, for staggered entrances. With `instant` everything jumps.

export class Anim {
  cur = new Map<string, number>();
  tgt = new Map<string, number>();
  rate = new Map<string, number>();
  hold = new Map<string, number>();
  instant = false;

  /** Set a target. `from` and `delay` apply only when the key is new. */
  set(key: string, target: number, opts?: { from?: number; delay?: number; rate?: number }) {
    if (!this.cur.has(key)) {
      this.cur.set(key, this.instant ? target : (opts?.from ?? target));
      if (opts?.delay && !this.instant) this.hold.set(key, performance.now() + opts.delay);
    }
    if (this.instant) this.cur.set(key, target);
    this.tgt.set(key, target);
    if (opts?.rate) this.rate.set(key, opts.rate);
  }

  /** Restart a key from `from` (after an optional delay) toward its target. */
  kick(key: string, from: number, delay = 0) {
    if (this.instant) return;
    this.cur.set(key, from);
    if (delay) this.hold.set(key, performance.now() + delay);
  }

  get(key: string, fallback = 0): number {
    return this.cur.get(key) ?? fallback;
  }

  target(key: string): number | undefined {
    return this.tgt.get(key);
  }

  drop(prefix: string) {
    for (const m of [this.cur, this.tgt, this.rate, this.hold]) for (const k of [...m.keys()]) if (k.startsWith(prefix)) m.delete(k);
  }

  /** Every key at its target at once, holds and all: the settled picture. */
  snap() {
    for (const [k, t] of this.tgt) this.cur.set(k, t);
    this.hold.clear();
  }

  /** Every key whose delay has passed, at its target at once (after a stalled frame, so no figure is left half-way). */
  settle(now: number) {
    for (const [k, t] of this.tgt) {
      const until = this.hold.get(k);
      if (until !== undefined && now < until) continue;
      this.hold.delete(k);
      this.cur.set(k, t);
    }
  }

  moving(): boolean {
    for (const [k, t] of this.tgt) if (this.cur.get(k) !== t) return true;
    return false;
  }

  /** Advance by dt seconds; returns whether anything is still moving. */
  tick(dt: number, now: number): boolean {
    let moving = false;
    const k = 1 - Math.exp(-dt * 6);
    for (const [key, t] of this.tgt) {
      const c = this.cur.get(key) ?? t;
      if (c === t) continue;
      moving = true;
      const until = this.hold.get(key);
      if (until !== undefined) {
        if (now < until) continue;
        this.hold.delete(key);
      }
      const r = this.rate.get(key);
      let next: number;
      if (r) next = c < t ? Math.min(t, c + r * dt) : Math.max(t, c - r * dt);
      else {
        next = c + (t - c) * k;
        if (Math.abs(t - next) < 0.004) next = t;
      }
      this.cur.set(key, next);
    }
    return moving;
  }
}
