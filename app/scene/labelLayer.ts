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
    let n = 0;
    for (let i = 0; i < list.length && n < MAX; i++) {
      const el = list[i];
      const anchor = el.parentElement;
      if (!anchor || el.classList.contains("is-docked") || el.getAttribute("aria-hidden") === "true" || el.offsetParent === null) {
        if (el.style.getPropertyValue("--dodge")) el.style.removeProperty("--dodge");
        continue;
      }
      // The parent is drei's centring box: where the tag sits before any dodge.
      const r = anchor.getBoundingClientRect();
      els[n] = el;
      boxL[n] = r.left;
      boxR[n] = r.right;
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
