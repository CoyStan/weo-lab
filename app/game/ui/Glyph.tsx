/**
 * The game's few symbols as inline SVG, so they sit on the text baseline and look the same
 * on every OS (the unicode ★ ▲ ▼ → vary by font and float off the baseline). They draw in
 * currentColor at 0.8em, so a glyph always takes its line's size and colour.
 */
export type GlyphName = "star" | "star-outline" | "up" | "down" | "arrow" | "chevron" | "lock";

const PATHS: Record<GlyphName, React.ReactNode> = {
  star: <path d="M8 1.2l2.1 4.4 4.8.6-3.5 3.3.9 4.8L8 12 3.7 14.3l.9-4.8L1.1 6.2l4.8-.6z" fill="currentColor" />,
  "star-outline": <path d="M8 1.9l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2.1.7-4.3-3.1-3 4.3-.6z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />,
  up: <path d="M8 2.5l6 10H2z" fill="currentColor" />,
  down: <path d="M8 13.5l6-10H2z" fill="currentColor" />,
  arrow: <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />,
  chevron: <path d="M5.5 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />,
  lock: <path d="M4 7.5h8v6.5H4zM5.8 7.5V5.2a2.2 2.2 0 0 1 4.4 0v2.3" fill="none" stroke="currentColor" strokeWidth="1.5" />,
};

export default function Glyph({ name, label, className = "" }: { name: GlyphName; label?: string; className?: string }) {
  return (
    <svg className={`game-glyph ${className}`} viewBox="0 0 16 16" width="0.8em" height="0.8em" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ display: "inline-block", verticalAlign: "-0.1em", flex: "none" }}>
      {PATHS[name]}
    </svg>
  );
}
