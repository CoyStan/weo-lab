"use client";

import { Html } from "@react-three/drei";
import { labelLayer } from "./labelLayer";

export type IconName = "crown" | "scroll" | "bank" | "gauge" | "factory" | "anchor" | "coins" | "house" | "beacon" | "drop";

/** Simple 16px emblems drawn with strokes, so they inherit the banner's colour. */
const ICONS: Record<IconName, React.ReactNode> = {
  crown: <path d="M2.5 12.5h11M3 11 2 5l3.5 3L8 3.5 10.5 8 14 5l-1 6H3Z" />,
  scroll: <path d="M4 3h7a2 2 0 0 1 2 2v8H6a2 2 0 0 1-2-2V3Zm0 0a1.5 1.5 0 0 0-1.5 1.5V5H4M7 6h4M7 9h4" />,
  bank: <path d="M2 6 8 2.5 14 6M3 6.5h10M4 7.5v5M8 7.5v5M12 7.5v5M2.5 13.5h11" />,
  gauge: <path d="M8 2.5v7.5M8 10a2 2 0 1 0 .01 0M6 4h4M6 6.5h1.5" />,
  factory: <path d="M2 13.5V7l3.5 2.2V7L9 9.2V4h3v9.5H2ZM5 11.5h1.5M8.5 11.5H10" />,
  anchor: <path d="M8 4.5V14M5.5 7h5M3 10a5 4 0 0 0 10 0M8 2.5a1 1 0 1 0 .01 0" />,
  coins: <path d="M3 5.5c0-1.1 2.2-2 5-2s5 .9 5 2-2.2 2-5 2-5-.9-5-2Zm0 0v5c0 1.1 2.2 2 5 2s5-.9 5-2v-5M3 8c0 1.1 2.2 2 5 2s5-.9 5-2" />,
  house: <path d="M2.5 8 8 3l5.5 5M4 7v6.5h8V7M7 13.5v-3h2v3" />,
  beacon: <path d="M6 14l.8-8h2.4L10 14M5.5 6h5M8 3.5V6M3 4.5l2 1M13 4.5l-2 1" />,
  drop: <path d="M8 2.5S4 7.2 4 9.7a4 4 0 0 0 8 0C12 7.2 8 2.5 8 2.5Z" />,
};

/**
 * District banner pinned in 3D, in the style of strategy-game city banners:
 * a coloured emblem, the district name and its live reading, with a pointer
 * down to the building. It stays mounted and hides with CSS: drei's Html
 * portals into the canvas wrapper, and mounting and unmounting it on every
 * hover races React's DOM removal.
 */
export default function Label({
  position,
  title,
  value,
  bad,
  focus,
  tilt = 0,
  hidden = false,
  accent,
  icon,
  capital = false,
}: {
  position: [number, number, number];
  title: string;
  value: string;
  bad?: boolean;
  focus?: boolean;
  tilt?: number;
  hidden?: boolean;
  accent?: string;
  icon?: IconName;
  /** The capital's banner: larger, ink-filled. */
  capital?: boolean;
}) {
  return (
    <Html position={position} center zIndexRange={[8, 0]} style={{ pointerEvents: "none" }} portal={labelLayer as React.RefObject<HTMLElement>}>
      <div
        aria-hidden={hidden}
        className={`lab-scene-label ${capital ? "is-capital" : ""} ${bad ? "is-bad" : ""} ${focus ? "is-focus" : ""}`}
        style={{ transform: `rotate(${tilt * 0.4}deg)`, opacity: hidden ? 0 : 1, transition: "opacity 160ms ease", ["--label-accent" as string]: accent ?? "var(--lab-scenario)" }}
      >
        {icon ? (
          <span className="lab-banner-icon" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[icon]}
            </svg>
          </span>
        ) : null}
        <span className="lab-banner-text">
          {title}
          <strong>{value}</strong>
        </span>
      </div>
    </Html>
  );
}
