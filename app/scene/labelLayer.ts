/**
 * Stable DOM layer for every drei <Html> overlay. Without an explicit portal
 * drei mounts each overlay into the canvas's parent, which only exists after
 * the canvas attaches; the target then changes once and the first overlay's
 * root is torn down mid-render and left empty.
 */
export const labelLayer: { current: HTMLDivElement | null } = { current: null };

/** Room between tags, and between a tag and anything else over the island. */
const GAP = 4;
/** Tags keep this far inside the island's frame. */
const EDGE = 6;
/** The stem's length when the tag sits right above (or below) its building. */
const STEM = 10;
const MAX = 16;
const MAX_OBS = 12;
// Scratch storage reused on every pass, so placing tags allocates no arrays.
const ax = new Float32Array(MAX);
const ay = new Float32Array(MAX);
const tw = new Float32Array(MAX);
const th = new Float32Array(MAX);
const pri = new Float32Array(MAX);
/** Free play's capital: its tag names the whole town, so it may sit over the town's middle. */
const cap = new Uint8Array(MAX);
const pl = new Float32Array(MAX);
const pt = new Float32Array(MAX);
const ol = new Float32Array(MAX_OBS);
const or = new Float32Array(MAX_OBS);
const ot = new Float32Array(MAX_OBS);
const ob = new Float32Array(MAX_OBS);
const order: number[] = [];
/** Whether each tag found a spot, whether its spot puts a stem across a tag, and the best pass so far (see pass). */
const ok = new Uint8Array(MAX);
const crossed = new Uint8Array(MAX);
const boost = new Float32Array(MAX);
const bpl = new Float32Array(MAX);
const bpt = new Float32Array(MAX);
const bok = new Uint8Array(MAX);
const bcrossed = new Uint8Array(MAX);
/** Each tag's spot (an index into SPOTS) on the last pass, -1 for none; the one picked now; the best pass's. */
const prevSpot = new Int8Array(MAX);
const spot = new Int8Array(MAX);
const bspot = new Int8Array(MAX);
/** The tags placed so far in a pass, in the order they were placed; whether each is done. */
const placed = new Int8Array(MAX);
const done = new Uint8Array(MAX);
const els: HTMLElement[] = [];
/** Rows above the building (0, 1, 2…) and below it (−1, −2), in the order they are tried. */
const LEVELS = [0, 1, -1, 2, -2, 3, -3, 4, 5, 6];
/** Sideways shifts, as a share of the tag's width, so its stem still lands on the tag. */
const SHIFTS = [0, -0.25, 0.25, -0.45, 0.45];
/** Every spot, LEVELS × SHIFTS, numbered in the order they are tried: spot = level index × SHIFTS.length + shift index. */
const SPOTS = LEVELS.length * SHIFTS.length;

/**
 * A spot's price. Covering another tag, an overlay or the frame's edge is forbidden (hard);
 * covering a landmark's upper floors is allowed but costs (soft, per px² covered), and so does
 * each row and each sideways step away from right above the building, so a tag moves off a
 * building only to a spot close by.
 */
const ROW_COST = 100;
const SHIFT_COST = 15;
const SOFT_COST = 0.5;
/**
 * The box round a landmark's anchor (the top of its building) that other tags try to leave
 * visible: the building's upper floors. In units of that landmark's tag height, so it grows
 * with the type on a TV: 24 px wide, from 4 px above the anchor to 40 px below, on a laptop.
 */
const MARK_HALF_W = 0.45;
const MARK_UP = 0.15;
const MARK_DOWN = 1.5;
/** Soft costs are counted in px² as they would be with a laptop's 27 px tags. */
const REF_H = 27;
/**
 * A tag keeps its spot until it would overlap another tag or an overlay, or come within 2 px of
 * the frame's edge: this much (px) closer than a new spot may be, so tags that drift together
 * as the camera turns do not trade places at the first touch.
 */
const KEEP_SLACK = 4;
/**
 * A landmark drifting under a tag moves the tag only once it hides more than half of that
 * landmark's box (px²), and only to a free spot cheaper by SOFT_GAIN that hides less than a
 * quarter as much (so the tag does not land beside the building and have to move again as it
 * drifts on); short of that, covering a landmark just steers where a tag goes when it has to move.
 */
const SOFT_MOVE = 0.5 * 2 * MARK_HALF_W * (MARK_UP + MARK_DOWN) * REF_H * REF_H;
const SOFT_CLEAR = SOFT_MOVE / 4;
const SOFT_GAIN = 60;
/** A tag steps back toward its building only into a spot this much cheaper (more than a row), and this far clear of every other tag (px). */
const SETTLE_GAIN = 150;
const SETTLE_MARGIN = 10;
/** A spot's price for where it is, before anything it covers. */
const spotCost = (s: number) => ((s / SHIFTS.length) | 0) * ROW_COST + (s % SHIFTS.length) * SHIFT_COST;
/**
 * A stem that runs through another tag points at the wrong building ("Growth" seems to stand on
 * the inflation stack), so a spot that puts a stem across a tag, its own stem or another's, is
 * taken only when every spot clear of the other tags does (then the tag still shows rather
 * than wait). How near a stem may pass a tag's edge (px), and the price per px it runs inside.
 */
const STEM_GAP = 2;
const CROSS_COST = 1e6;
const CROSS_PX = 100;

/** Overlays over the island that tags must keep clear of: the view toggle, news, the sandbox's panels. */
const OBSTACLES = ".game-scene-tabs, .game-toast, .game-scene-coach, .game-run, .lab-scene-overlay > div";

/** Passes left to run: a few after each change, since drei moves the tags in its own frame. */
let dirty = 3;
/** Set while the island is hidden: nothing to place. */
let paused = false;
/** Runs the next pass on the next animation frame (set by startLabelDodge). */
let schedule: () => void = () => {};

/** The camera moved, the canvas resized, or a tag changed: place the tags again. */
export function markLabelsDirty() {
  dirty = 3;
  schedule();
}

export function setLabelsPaused(p: boolean) {
  paused = p;
  if (!p) markLabelsDirty();
}

type Last = Int32Array;
const LAST = "__islLast";
/** The spot (index into SPOTS) a tag had on the last pass, kept on its element. */
const SPOT = "__islSpot";

function write(el: HTMLElement, x: number, y: number, sx: number, sy: number, sh: number, off: boolean) {
  const holder = el as HTMLElement & { [LAST]?: Last };
  let last = holder[LAST];
  if (!last) {
    last = new Int32Array(6).fill(-99999);
    holder[LAST] = last;
  }
  const o = off ? 1 : 0;
  if (last[0] === x && last[1] === y && last[2] === sx && last[3] === sy && last[4] === sh && last[5] === o) return;
  last[0] = x;
  last[1] = y;
  last[2] = sx;
  last[3] = sy;
  last[4] = sh;
  last[5] = o;
  const s = el.style;
  s.setProperty("--x", `${x}px`);
  s.setProperty("--y", `${y}px`);
  s.setProperty("--sx", `${sx}px`);
  s.setProperty("--sy", `${sy}px`);
  s.setProperty("--sh", `${sh}px`);
  if (off) el.setAttribute("data-off", "");
  else el.removeAttribute("data-off");
}

const overlap = (l1: number, t1: number, r1: number, b1: number, l2: number, t2: number, r2: number, b2: number) => {
  const w = Math.min(r1, r2) - Math.max(l1, l2);
  const h = Math.min(b1, b2) - Math.max(t1, t2);
  return w > 0 && h > 0 ? w * h : 0;
};

/**
 * Tag i's stem for a box at (l, t), as the last loop of the placing pass draws it: at the
 * anchor's x, kept 8 px inside the tag, from the tag's lower edge down to the anchor (or from
 * the anchor down to its top). Written to stemX, stemT and stemB.
 */
let stemX = 0;
let stemT = 0;
let stemB = 0;
function stemOf(i: number, l: number, t: number) {
  stemX = Math.min(Math.max(ax[i], l + 8), l + tw[i] - 8);
  if (t + th[i] <= ay[i]) {
    stemT = t + th[i];
    stemB = ay[i];
  } else {
    stemT = ay[i];
    stemB = Math.max(ay[i], t);
  }
}

/** A spot's box for tag i, written to boxL / boxT (its left and top). */
let boxL = 0;
let boxT = 0;
function spotBox(i: number, s: number, L: number, R: number) {
  const lv = LEVELS[(s / SHIFTS.length) | 0];
  const w = tw[i];
  const h = th[i];
  boxT = lv >= 0 ? ay[i] - STEM - h - lv * (h + GAP) : ay[i] + STEM + (-lv - 1) * (h + GAP);
  let x = ax[i] - w / 2 + SHIFTS[s % SHIFTS.length] * w;
  if (x < L) x = L;
  if (x + w > R) x = R - w;
  boxL = x;
}

/**
 * What a box at (x, y) for tag i runs into: `hard`, past the frame's edge, over the overlays,
 * and over the first `np` tags in `placed`, `pad` px farther apart than the usual gap (a
 * negative pad also lets it nearer the frame's edge); `cross`, px of stem across a tag: its own
 * stem across one of those tags, or one of their stems across it (a negative pad lets a stem
 * graze a tag's edge); `soft`, over the landmarks' upper floors, its own included (a tag below its
 * building hides it), except the capital's (its tag labels the town).
 */
let hard = 0;
let cross = 0;
let soft = 0;
function collide(i: number, np: number, n: number, x: number, y: number, T: number, B: number, nObs: number, pad: number) {
  const w = tw[i];
  const h = th[i];
  const top = pad < 0 ? T + pad : T;
  const bottom = pad < 0 ? B - pad : B;
  hard = 0;
  if (y < top) hard += (top - y) * w * 4;
  if (y + h > bottom) hard += (y + h - bottom) * w * 4;
  const l = x - GAP - pad;
  const t = y - GAP - pad;
  const r = x + w + GAP + pad;
  const b = y + h + GAP + pad;
  for (let j = 0; j < np; j++) {
    const o = placed[j];
    if (o === i) continue;
    hard += overlap(l, t, r, b, pl[o], pt[o], pl[o] + tw[o], pt[o] + th[o]);
  }
  for (let j = 0; j < nObs; j++) hard += overlap(l, t, r, b, ol[j], ot[j], or[j], ob[j]);
  cross = 0;
  const g = pad < 0 ? -STEM_GAP : STEM_GAP;
  stemOf(i, x, y);
  const sx = stemX;
  const st = stemT;
  const sb = stemB;
  for (let j = 0; j < np; j++) {
    const o = placed[j];
    if (o === i) continue;
    if (sb > st && sx > pl[o] - g && sx < pl[o] + tw[o] + g) cross += Math.max(0, Math.min(sb, pt[o] + th[o] + g) - Math.max(st, pt[o] - g));
    stemOf(o, pl[o], pt[o]);
    if (stemB > stemT && stemX > x - g && stemX < x + w + g) cross += Math.max(0, Math.min(stemB, y + h + g) - Math.max(stemT, y - g));
  }
  soft = 0;
  for (let j = 0; j < n; j++) {
    if (j === i && cap[i]) continue;
    const m = th[j];
    soft += overlap(x, y, x + w, y + h, ax[j] - MARK_HALF_W * m, ay[j] - MARK_UP * m, ax[j] + MARK_HALF_W * m, ay[j] + MARK_DOWN * m);
  }
  soft *= (REF_H * REF_H) / (h * h);
}

/** Tag i keeps the spot it had on the last pass if that still fits among the `np` tags placed so far. */
function keep(i: number, np: number, n: number, L: number, R: number, T: number, B: number, nObs: number): boolean {
  if (prevSpot[i] < 0) return false;
  spotBox(i, prevSpot[i], L, R);
  collide(i, np, n, boxL, boxT, T, B, nObs, -KEEP_SLACK);
  if (hard > 0 || cross > 0) return false;
  pl[i] = boxL;
  pt[i] = boxT;
  spot[i] = prevSpot[i];
  ok[i] = 1;
  crossed[i] = 0;
  return true;
}

/**
 * Tag i takes the cheapest spot among the `np` tags placed so far: free of every hard
 * obstacle, then with no stem across a tag, then covering the least of the landmarks' upper
 * floors, then nearest right above its building. Returns whether it found a free one.
 */
function search(i: number, np: number, n: number, L: number, R: number, T: number, B: number, nObs: number): boolean {
  let bestCost = Infinity;
  let bestHard = Infinity;
  let bestCross = Infinity;
  for (let s = 0; s < SPOTS; s++) {
    spotBox(i, s, L, R);
    collide(i, np, n, boxL, boxT, T, B, nObs, 0);
    const cost = (hard > 0 ? 1e9 + hard * 4 : 0) + (cross > 0 ? CROSS_COST + cross * CROSS_PX : 0) + soft * SOFT_COST + spotCost(s);
    if (cost < bestCost) {
      bestCost = cost;
      bestHard = hard;
      bestCross = cross;
      spot[i] = s;
      pl[i] = boxL;
      pt[i] = boxT;
    }
    // Nothing later in the order can be cheaper than a free spot that covers nothing.
    if (hard === 0 && cross === 0 && soft === 0) break;
  }
  // The tag under the pointer shows even without a free spot; any other waits.
  ok[i] = bestHard === 0 || pri[i] >= 3 ? 1 : 0;
  crossed[i] = ok[i] && bestCross > 0 ? 1 : 0;
  return bestHard === 0;
}

/**
 * One pass in `order`. First the tags a failed pass moved up (and the one under the pointer)
 * find a spot; then every other tag keeps the spot it had on the last pass while that spot is
 * still inside the frame and clear of the tags already placed and of the overlays, so a
 * turning or flying camera does not send tags jumping from spot to spot; then the tags that
 * could not keep theirs search for one. Records pl/pt/spot/ok/crossed; returns how bad the
 * pass is: the tags that found no free spot, each worth more than all the tags left with a
 * stem across a tag put together, plus those.
 */
function pass(n: number, L: number, R: number, T: number, B: number, nObs: number): number {
  let np = 0;
  let failed = 0;
  for (let k = 0; k < n; k++) {
    done[order[k]] = 0;
    ok[order[k]] = 0;
    crossed[order[k]] = 0;
  }
  for (let k = 0; k < n; k++) {
    const i = order[k];
    if (boost[i] <= 0 && pri[i] < 3) continue;
    if (!keep(i, np, n, L, R, T, B, nObs) && !search(i, np, n, L, R, T, B, nObs)) failed++;
    if (ok[i]) placed[np++] = i;
    done[i] = 1;
  }
  for (let k = 0; k < n; k++) {
    const i = order[k];
    if (done[i] || !keep(i, np, n, L, R, T, B, nObs)) continue;
    placed[np++] = i;
    done[i] = 1;
  }
  for (let k = 0; k < n; k++) {
    const i = order[k];
    if (done[i]) continue;
    if (!search(i, np, n, L, R, T, B, nObs)) failed++;
    if (ok[i]) placed[np++] = i;
    done[i] = 1;
  }
  let crossings = 0;
  for (let k = 0; k < n; k++) crossings += crossed[order[k]];
  return failed * (MAX + 1) + crossings;
}

/**
 * After the pass, without displacing any other tag (a spot must be clear of every other tag
 * and stem): a tag pushed well away from its building (a row or more) steps back to a much
 * cheaper spot nearer it once there is room to spare, a tag that now hides most of a landmark's
 * upper floors steps to a cheaper free spot that shows them, and a tag left with a stem across
 * a tag steps to any spot where none crosses. The margin, the gains and the threshold keep a
 * tag from flickering between two spots.
 */
function settle(n: number, L: number, R: number, T: number, B: number, nObs: number) {
  let np = 0;
  for (let k = 0; k < n; k++) if (ok[order[k]]) placed[np++] = order[k];
  for (let k = 0; k < n; k++) {
    const i = order[k];
    if (!ok[i]) continue;
    spotBox(i, spot[i], L, R);
    collide(i, np, n, boxL, boxT, T, B, nObs, 0);
    // Anywhere free, if a stem crosses a tag or it hides a landmark; otherwise only nearer its
    // building, with room to spare.
    const crosses = cross > 0;
    const hides = soft > SOFT_MOVE;
    const upto = crosses || hides ? SPOTS : spot[i];
    const pad = crosses || hides ? 0 : SETTLE_MARGIN;
    let best = -1;
    let bestCost = crosses ? Infinity : soft * SOFT_COST + spotCost(spot[i]) - (hides ? SOFT_GAIN : SETTLE_GAIN);
    for (let s = 0; s < upto; s++) {
      if (s === spot[i]) continue;
      spotBox(i, s, L, R);
      collide(i, np, n, boxL, boxT, T, B, nObs, pad);
      const cost = soft * SOFT_COST + spotCost(s);
      if (hard === 0 && cross === 0 && cost < bestCost && (crosses || !hides || soft <= SOFT_CLEAR)) {
        bestCost = cost;
        best = s;
      }
    }
    if (best < 0) continue;
    spotBox(i, best, L, R);
    pl[i] = boxL;
    pt[i] = boxT;
    spot[i] = best;
    crossed[i] = 0;
  }
}

/**
 * Places the landmark tags. drei pins each tag's anchor over its building; this pass puts the
 * tag itself where it reads: right above the building if there is room, else a row higher,
 * just below, or nudged sideways, never over another tag, the view toggle or the news, never
 * past the island's frame, and off the other landmarks where it can. A tag keeps its spot
 * while the camera moves until that spot runs into something, and when it does move, it
 * glides there (island.css). A thin stem runs from the tag back to the building. It runs
 * only when something moved (the camera, the canvas, a tag's text) and once a second besides,
 * so a still island costs next to nothing.
 */
export function startLabelDodge(root: HTMLElement): () => void {
  let raf = 0;
  const pins = root.getElementsByClassName("isl-pin") as HTMLCollectionOf<HTMLElement>;
  let canvas: HTMLCanvasElement | null = null;
  const mo = new MutationObserver(markLabelsDirty);
  mo.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "aria-hidden"] });
  const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(markLabelsDirty);
  ro?.observe(root);

  const place = () => {
    if (!canvas || !canvas.isConnected) canvas = root.parentElement?.querySelector("canvas") ?? null;
    if (!canvas) return;
    const fr = canvas.getBoundingClientRect();
    if (fr.width < 2 || fr.height < 2) return;
    const L = fr.left + EDGE;
    const R = fr.right - EDGE;
    const T = fr.top + EDGE;
    const B = fr.bottom - EDGE;

    let nObs = 0;
    const host = root.closest(".game-scene, .lab-scene");
    if (host) {
      const list = host.querySelectorAll<HTMLElement>(OBSTACLES);
      for (let i = 0; i < list.length && nObs < MAX_OBS; i++) {
        const el = list[i];
        if (el.offsetParent === null) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1 || r.right < fr.left || r.left > fr.right || r.bottom < fr.top || r.top > fr.bottom) continue;
        ol[nObs] = r.left;
        or[nObs] = r.right;
        ot[nObs] = r.top;
        ob[nObs] = r.bottom;
        nObs++;
      }
    }

    let n = 0;
    for (let i = 0; i < pins.length; i++) {
      const el = pins[i];
      if (el.classList.contains("is-hidden") || n >= MAX) continue;
      const tag = el.children[1] as HTMLElement | undefined;
      if (!tag) continue;
      const r = el.getBoundingClientRect();
      const w = tag.offsetWidth;
      const h = tag.offsetHeight;
      // A building outside the frame (the camera flew in elsewhere) takes its tag with it.
      if (w === 0 || r.left < fr.left || r.left > fr.right || r.top < fr.top || r.top > fr.bottom) {
        write(el, Math.round(-w / 2), Math.round(-h - STEM), 0, -STEM, STEM, true);
        continue;
      }
      els[n] = el;
      prevSpot[n] = (el as HTMLElement & { [SPOT]?: number })[SPOT] ?? -1;
      ax[n] = r.left;
      ay[n] = r.top;
      tw[n] = w;
      th[n] = h;
      cap[n] = el.classList.contains("is-capital") ? 1 : 0;
      pri[n] = el.classList.contains("is-focus") ? 3 : el.classList.contains("has-status") ? 2 : cap[n] ? 0.5 : 1;
      n++;
    }
    order.length = n;
    for (let i = 0; i < n; i++) {
      order[i] = i;
      boost[i] = 0;
    }
    // The most important first; then from the bottom of the picture up, so higher tags step
    // aside. If a tag finds no room (or only a spot where a stem crosses a tag), try again with
    // it placed first (the others then make room round it), and keep whichever pass leaves the
    // fewest tags waiting, then the fewest stems across tags (on a tie, the first: it moves the
    // fewest tags).
    const byRank = (a: number, b: number) => (pri[b] >= 3 ? 1 : 0) - (pri[a] >= 3 ? 1 : 0) || boost[b] - boost[a] || pri[b] - pri[a] || ay[b] - ay[a];
    order.sort(byRank);
    let failed = pass(n, L, R, T, B, nObs);
    if (failed > 0) {
      let best = failed;
      bpl.set(pl);
      bpt.set(pt);
      bok.set(ok);
      bcrossed.set(crossed);
      bspot.set(spot);
      for (let attempt = 0; attempt < 3 && best > 0; attempt++) {
        for (let i = 0; i < n; i++) if (!ok[i] || crossed[i]) boost[i] += 1;
        order.sort(byRank);
        failed = pass(n, L, R, T, B, nObs);
        if (failed < best) {
          best = failed;
          bpl.set(pl);
          bpt.set(pt);
          bok.set(ok);
          bcrossed.set(crossed);
          bspot.set(spot);
        }
      }
      pl.set(bpl);
      pt.set(bpt);
      ok.set(bok);
      crossed.set(bcrossed);
      spot.set(bspot);
    }
    settle(n, L, R, T, B, nObs);

    for (let i = 0; i < n; i++) {
      const w = tw[i];
      const h = th[i];
      // Nowhere free (a phone showing every district in free play): the tag waits until there
      // is room, rather than cover another; the one under the pointer always shows.
      if (!ok[i]) {
        write(els[i], Math.round(-w / 2), Math.round(-h - STEM), 0, -STEM, STEM, true);
        continue;
      }
      (els[i] as HTMLElement & { [SPOT]?: number })[SPOT] = spot[i];
      const x = Math.round(pl[i] - ax[i]);
      const y = Math.round(pt[i] - ay[i]);
      // The stem: from the building up to the tag's lower edge (or down to its top), at the
      // anchor's x, kept on the tag.
      const above = y + h <= 0;
      const sx = Math.round(Math.min(Math.max(0, x + 8), x + w - 8));
      const sy = above ? y + h : 0;
      const sh = above ? -(y + h) : Math.max(0, y);
      write(els[i], x, y, sx, sy, sh, false);
    }
    els.length = 0;
  };

  const tick = () => {
    raf = 0;
    if (paused || dirty <= 0) return;
    dirty--;
    place();
    if (dirty > 0) raf = requestAnimationFrame(tick);
  };
  schedule = () => {
    if (!raf && !paused) raf = requestAnimationFrame(tick);
  };
  // Now and then, place again anyway: a web font arriving, a toast appearing over the island.
  const every = window.setInterval(() => {
    if (!paused && dirty <= 0) {
      dirty = 1;
      schedule();
    }
  }, 1000);
  document.fonts?.ready.then(markLabelsDirty).catch(() => {});
  markLabelsDirty();
  return () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    schedule = () => {};
    window.clearInterval(every);
    mo.disconnect();
    ro?.disconnect();
  };
}

/**
 * Name every district on the island for a while (a lever moving, a quarter just ended). The
 * tags now always carry their names, so this only marks the layer (CSS may read it).
 */
let namingTimer: ReturnType<typeof setTimeout> | undefined;
export function nameDistricts(ms: number | "hold" | "off") {
  clearTimeout(namingTimer);
  const el = labelLayer.current;
  if (!el) return;
  el.classList.toggle("is-naming", ms !== "off");
  if (typeof ms === "number") namingTimer = setTimeout(() => labelLayer.current?.classList.remove("is-naming"), ms);
}
