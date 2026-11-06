"use client";

import { useEffect, useLayoutEffect, type RefObject } from "react";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * One behaviour for every tab strip: `data-overflow="true"` only while its tabs do not fit
 * (the theme then scrolls the row, snaps it and fades its right edge; otherwise the row is
 * left alone), and the active tab is scrolled into view whenever `active` changes.
 */
export function useStripOverflow(ref: RefObject<HTMLElement | null>, active?: unknown) {
  useIso(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      let right = 0;
      for (const c of Array.from(el.children)) right = Math.max(right, c.getBoundingClientRect().right);
      // Where the tabs end, in the strip's own scrolled coordinates.
      const end = right - box.left + el.scrollLeft;
      const over = end > el.clientWidth + 1;
      if ((el.dataset.overflow === "true") !== over) el.dataset.overflow = over ? "true" : "false";
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const c of Array.from(el.children)) ro.observe(c);
    return () => ro.disconnect();
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.dataset.overflow !== "true") return;
    const on = el.querySelector<HTMLElement>('[aria-selected="true"], [aria-checked="true"], .is-on, .is-active');
    if (!on) return;
    const left = on.offsetLeft - el.offsetLeft;
    const pad = 32;
    if (left < el.scrollLeft + pad) el.scrollLeft = Math.max(0, left - pad);
    else if (left + on.offsetWidth > el.scrollLeft + el.clientWidth - pad) el.scrollLeft = left + on.offsetWidth - el.clientWidth + pad;
  }, [ref, active]);
}

/**
 * A bar that stays on screen over scrolling content (a fixed dock or a sticky footer):
 * its height is published as `--sticky-h` on the element that scrolls under it, so the
 * theme can end that content clear of the bar and keep focused items out from under it.
 * A fixed bar publishes on the document root (the page scrolls); a sticky one on its
 * nearest scrolling ancestor. A bar that is neither publishes 0px.
 */
export function useStickyH(ref: RefObject<HTMLElement | null>, key?: unknown) {
  useEffect(() => {
    const bar = ref.current;
    if (!bar || typeof ResizeObserver === "undefined") return;
    let target: HTMLElement | null = null;
    const scroller = () => {
      const pos = getComputedStyle(bar).position;
      if (pos === "fixed") return { el: document.documentElement, on: true };
      for (let p = bar.parentElement; p; p = p.parentElement) {
        const oy = getComputedStyle(p).overflowY;
        if (oy === "auto" || oy === "scroll") return { el: p, on: pos === "sticky" };
      }
      return { el: document.documentElement, on: false };
    };
    const ro = new ResizeObserver(() => {
      const { el, on } = scroller();
      if (target && target !== el) target.style.removeProperty("--sticky-h");
      target = el;
      el.style.setProperty("--sticky-h", on ? `${Math.ceil(bar.getBoundingClientRect().height)}px` : "0px");
    });
    ro.observe(bar);
    return () => {
      ro.disconnect();
      target?.style.removeProperty("--sticky-h");
    };
  }, [ref, key]);
}

/**
 * A scroll pane that sits above a footer: `data-more="true"` while there is more to scroll
 * below its fold, so the theme fades its bottom edge into paper only then. At the end of
 * the pane the last line sits clear of the fade, never sliced by it.
 */
export function useScrollMore(ref: RefObject<HTMLElement | null>, key?: unknown) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const more = el.scrollHeight - el.scrollTop - el.clientHeight > 4;
      if ((el.dataset.more === "true") !== more) el.dataset.more = more ? "true" : "false";
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const c of Array.from(el.children)) ro.observe(c);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [ref, key]);
}
