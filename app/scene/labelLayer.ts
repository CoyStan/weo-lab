/**
 * Stable DOM layer for every drei <Html> overlay. Without an explicit portal
 * drei mounts each overlay into the canvas's parent, which only exists after
 * the canvas attaches; the target then changes once and the first overlay's
 * root is torn down mid-render and left empty.
 */
export const labelLayer: { current: HTMLDivElement | null } = { current: null };

const GAP = 4;
const MAX = 24;
// Scratch storage reused on every pass, so the dodge loop allocates nothing per frame.
const boxL = new Float32Array(MAX);
const boxR = new Float32Array(MAX);
const boxT = new Float32Array(MAX);
const boxB = new Float32Array(MAX);
const order: number[] = [];
const els: HTMLElement[] = [];
const shown = new Float32Array(MAX);
const nudge = new Float32Array(MAX);
/** Tags keep this far inside the island's frame. */
const EDGE = 6;

/**
 * Vertical collision resolution for the district tags. drei places each tag over its
 * building; where two would overlap on screen, the higher one is lifted clear and its
 * leader line stretches back down to the building. Runs every few frames on the DOM
 * layer only (the 3D scene is untouched), and writes a --dodge offset the CSS applies
 * with `translate`, so it composes with each tag's own transform.
 */
export function startLabelDodge(root: HTMLElement): () => void {
  let raf = 0;
  let frame = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (++frame % 4) return;
    const list = root.querySelectorAll<HTMLElement>(".lab-scene-label");
    const naming = root.classList.contains("is-naming");
    const frameBox = root.getBoundingClientRect();
    let n = 0;
    for (let i = 0; i < list.length && n < MAX; i++) {
      const el = list[i];
      const anchor = el.parentElement;
      if (!anchor || el.classList.contains("is-docked") || (!naming && el.getAttribute("aria-hidden") === "true") || el.offsetParent === null) {
        if (el.style.getPropertyValue("--dodge")) el.style.removeProperty("--dodge");
        if (el.style.getPropertyValue("--nudge")) el.style.removeProperty("--nudge");
        continue;
      }
      // The parent is drei's centring box: where the tag sits before any dodge. A tag that
      // would run off the island's frame (a narrow stage beside the recap) slides back in.
      const r = anchor.getBoundingClientRect();
      let dx = 0;
      if (r.right > frameBox.right - EDGE) dx = frameBox.right - EDGE - r.right;
      if (r.left + dx < frameBox.left + EDGE) dx = frameBox.left + EDGE - r.left;
      els[n] = el;
      nudge[n] = Math.round(dx);
      boxL[n] = r.left + dx;
      boxR[n] = r.right + dx;
      boxT[n] = r.top;
      boxB[n] = r.bottom;
      n++;
    }
    order.length = n;
    for (let i = 0; i < n; i++) order[i] = i;
    // Lowest tags keep their place; higher ones move up out of the way.
    order.sort((a, b) => boxB[b] - boxB[a]);
    for (let k = 0; k < n; k++) {
      const i = order[k];
      const h = boxB[i] - boxT[i];
      let top = boxT[i];
      for (let pass = 0; pass < 4; pass++) {
        let moved = false;
        for (let j = 0; j < k; j++) {
          const o = order[j];
          if (boxR[i] + GAP <= boxL[o] || boxL[i] >= boxR[o] + GAP) continue;
          const pt = shown[o];
          const pb = pt + (boxB[o] - boxT[o]);
          if (top + h + GAP > pt && top < pb + GAP) {
            top = pt - h - GAP;
            moved = true;
          }
        }
        if (!moved) break;
      }
      shown[i] = top;
      const dodge = Math.round(top - boxT[i]);
      const next = dodge ? `${dodge}px` : "";
      const nx = nudge[i] ? `${nudge[i]}px` : "";
      if (els[i].style.getPropertyValue("--nudge") !== nx) {
        if (nx) els[i].style.setProperty("--nudge", nx);
        else els[i].style.removeProperty("--nudge");
      }
      if (els[i].style.getPropertyValue("--dodge") !== next) {
        if (next) els[i].style.setProperty("--dodge", next);
        else els[i].style.removeProperty("--dodge");
      }
    }
    els.length = 0;
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/**
 * Name every district on the island for a while (a lever moving, a quarter just ended):
 * a class on the label layer that CSS reads, so it costs no React render.
 */
let namingTimer: ReturnType<typeof setTimeout> | undefined;
export function nameDistricts(ms: number | "hold" | "off") {
  clearTimeout(namingTimer);
  const el = labelLayer.current;
  if (!el) return;
  el.classList.toggle("is-naming", ms !== "off");
  if (typeof ms === "number") namingTimer = setTimeout(() => labelLayer.current?.classList.remove("is-naming"), ms);
}
