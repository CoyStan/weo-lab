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
const pl = new Float32Array(MAX);
const pt = new Float32Array(MAX);
const ol = new Float32Array(MAX_OBS);
const or = new Float32Array(MAX_OBS);
const ot = new Float32Array(MAX_OBS);
const ob = new Float32Array(MAX_OBS);
const order: number[] = [];
/** Whether each tag found a spot, and the best pass so far (see greedy). */
const ok = new Uint8Array(MAX);
const boost = new Float32Array(MAX);
const bpl = new Float32Array(MAX);
const bpt = new Float32Array(MAX);
const bok = new Uint8Array(MAX);
const els: HTMLElement[] = [];
/** Rows above the building (0, 1, 2…) and below it (−1, −2), in the order they are tried. */
const LEVELS = [0, 1, -1, 2, -2, 3, -3, 4, 5, 6];
/** Sideways shifts, as a share of the tag's width, so its stem still lands on the tag. */
const SHIFTS = [0, -0.25, 0.25, -0.45, 0.45];

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
 * One greedy pass in `order`: each tag takes the first free spot (right above its building,
 * a row higher, just below, nudged sideways), inside the frame and clear of the tags already
 * placed and of the overlays. Records pl/pt/ok; returns how many tags found no free spot.
 */
function greedy(n: number, L: number, R: number, T: number, B: number, nObs: number): number {
  let failed = 0;
  for (let k = 0; k < n; k++) {
    const i = order[k];
    const w = tw[i];
    const h = th[i];
    let bestX = ax[i] - w / 2;
    let bestY = ay[i] - STEM - h;
    let bestScore = Infinity;
    search: for (let li = 0; li < LEVELS.length; li++) {
      const lv = LEVELS[li];
      const y = lv >= 0 ? ay[i] - STEM - h - lv * (h + GAP) : ay[i] + STEM + (-lv - 1) * (h + GAP);
      for (let si = 0; si < SHIFTS.length; si++) {
        let x = ax[i] - w / 2 + SHIFTS[si] * w;
        if (x < L) x = L;
        if (x + w > R) x = R - w;
        let score = 0;
        if (y < T) score += (T - y) * w * 4;
        if (y + h > B) score += (y + h - B) * w * 4;
        for (let j = 0; j < k; j++) {
          const o = order[j];
          if (!ok[o]) continue;
          score += overlap(x - GAP, y - GAP, x + w + GAP, y + h + GAP, pl[o], pt[o], pl[o] + tw[o], pt[o] + th[o]);
        }
        for (let j = 0; j < nObs; j++) score += overlap(x - GAP, y - GAP, x + w + GAP, y + h + GAP, ol[j], ot[j], or[j], ob[j]);
        if (score === 0) {
          bestX = x;
          bestY = y;
          bestScore = 0;
          break search;
        }
        if (score < bestScore) {
          bestScore = score;
          bestX = x;
          bestY = y;
        }
      }
    }
    pl[i] = bestX;
    pt[i] = bestY;
    // The tag under the pointer shows even without a free spot; any other waits.
    ok[i] = bestScore === 0 || pri[i] >= 3 ? 1 : 0;
    if (!ok[i]) failed++;
  }
  return failed;
}

/**
 * Places the landmark tags. drei pins each tag's anchor over its building; this pass puts the
 * tag itself where it reads: right above the building if there is room, else a row higher,
 * just below, or nudged sideways, never over another tag, the view toggle or the news, and
 * never past the island's frame. A thin stem runs from the tag back to the building. It runs
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
      ax[n] = r.left;
      ay[n] = r.top;
      tw[n] = w;
      th[n] = h;
      pri[n] = el.classList.contains("is-focus") ? 3 : el.classList.contains("has-status") ? 2 : el.classList.contains("is-capital") ? 0.5 : 1;
      n++;
    }
    order.length = n;
    for (let i = 0; i < n; i++) {
      order[i] = i;
      boost[i] = 0;
    }
    // The most important first; then from the bottom of the picture up, so higher tags step
    // aside. If a tag finds no room, try again with it placed earlier (the others then make
    // room round it), and keep whichever pass leaves the fewest tags waiting.
    const byRank = (a: number, b: number) => (pri[b] >= 3 ? 1 : 0) - (pri[a] >= 3 ? 1 : 0) || boost[b] - boost[a] || pri[b] - pri[a] || ay[b] - ay[a];
    order.sort(byRank);
    let failed = greedy(n, L, R, T, B, nObs);
    if (failed > 0) {
      let best = failed;
      bpl.set(pl);
      bpt.set(pt);
      bok.set(ok);
      for (let attempt = 0; attempt < 3 && best > 0; attempt++) {
        for (let i = 0; i < n; i++) if (!ok[i]) boost[i] += 1;
        order.sort(byRank);
        failed = greedy(n, L, R, T, B, nObs);
        if (failed < best) {
          best = failed;
          bpl.set(pl);
          bpt.set(pt);
          bok.set(ok);
        }
      }
      pl.set(bpl);
      pt.set(bpt);
      ok.set(bok);
    }

    for (let i = 0; i < n; i++) {
      const w = tw[i];
      const h = th[i];
      // Nowhere free (a phone showing every district in free play): the tag waits until there
      // is room, rather than cover another; the one under the pointer always shows.
      if (!ok[i]) {
        write(els[i], Math.round(-w / 2), Math.round(-h - STEM), 0, -STEM, STEM, true);
        continue;
      }
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
