// Small friendly line icons for the causal map: rounded strokes on a 24-unit grid.

import type { IconId } from "./model";

const P: Record<IconId, string> = {
  // Shocks
  "food-price": "M12 21V9 M12 13c-3 0-4.5-2-4.5-4.5C10 8.5 12 10 12 13Z M12 13c3 0 4.5-2 4.5-4.5C14 8.5 12 10 12 13Z M12 9c-2 0-3-1.6-3-3.5C11 5.5 12 7 12 9Z M12 9c2 0 3-1.6 3-3.5C13 5.5 12 7 12 9Z M12 9V3",
  "oil-spike": "M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11Z M9.5 15a2.5 2.5 0 0 0 2.5 2.5",
  "supply-shock": "M3 20V10l5 3V10l5 3V6h4l1 14Z M3 20h18",
  "natural-disaster": "M4 11 12 4l8 7 M6 10v10h12V10 M12 12l-2 3 3 1-2 4",
  pandemic: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z M12 3v4 M12 17v4 M3 12h4 M17 12h4 M5.6 5.6l2.9 2.9 M15.5 15.5l2.9 2.9 M18.4 5.6l-2.9 2.9 M8.5 15.5l-2.9 2.9",
  "global-recession": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18",
  "sudden-stop": "M4 12h11 M11 7l5 5-5 5 M19 5v14",
  "commodity-bust": "M4 17h16v3H4Z M6 17l2-6h8l2 6 M12 3v5 M9.5 6 12 8.5 14.5 6",
  "banking-crisis": "M3 9 12 4l9 5Z M5 9v8 M10 9v8 M14 9v8 M19 9v8 M3 20h18",
  downgrade: "M6 4h12v16H6Z M9 9h6 M9 13l3 3 3-3",
  "inflow-surge": "M20 12H9 M13 7l-5 5 5 5 M5 5v14",
  history: "M4 6h16v13H4Z M4 10h16 M8 3v4 M16 3v4 M8 14h3",
  drift: "M3 9c3-3 6 3 9 0s6 3 9 0 M3 15c3-3 6 3 9 0s6 3 9 0",
  // Levers
  rates: "M6 18 18 6 M7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z M16.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  budget: "M4 8h16v11H4Z M4 8l2-4h12l2 4 M15 13h2",
  currency: "M7 8h11l-3-3 M17 16H6l3 3",
  support: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z",
  // Channels
  costs: "M4 7h16l-2 12H6Z M9 7V5h6v2 M10 12h4",
  demand: "M3 4h3l2 11h10l2-8H7 M10 19.5a1 1 0 1 0 0-.01 M17 19.5a1 1 0 1 0 0-.01",
  expect: "M5 12a7 5 0 1 0 14 0 7 5 0 0 0-14 0Z M8 19l-2 2 M12 12h.01 M9 12h.01 M15 12h.01",
  fx: "M8 9a4 4 0 1 0 0 .01Z M16 15a4 4 0 1 0 0 .01Z M14 5h4v4 M10 19H6v-4",
  credit: "M3 7h18v10H3Z M3 11h18 M7 15h3",
  purse: "M5 9h14v10H5Z M8 9V7a4 4 0 0 1 8 0v2 M12 13v2",
  // Goals
  infl: "M12 4v10 M9 17a3 3 0 1 0 6 0c0-1.2-.7-2.2-1.5-2.7V5a1.5 1.5 0 0 0-3 0v9.3C9.7 14.8 9 15.8 9 17Z",
  growth: "M12 21v-9 M12 12c0-4 3-7 7-7 0 4-3 7-7 7Z M12 15c0-3-2.5-5-5.5-5 0 3 2.5 5 5.5 5Z",
  debt: "M7 4h10v16l-2.5-1.5L12 20l-2.5-1.5L7 20Z M10 9h4 M10 13h4",
  unemp: "M9 8a3 3 0 1 0 0-.01Z M3.5 19a5.5 5.5 0 0 1 11 0 M17 11a2.5 2.5 0 1 0 0-.01Z M16 19h5a4 4 0 0 0-4-4",
  ob: "M12 4v16 M5 8h14 M5 8l-2 6h4Z M19 8l-2 6h4Z",
  ca: "M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z M8 12h8 M13 9l3 3-3 3",
  reserves: "M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6Z M9 12l2 2 4-4",
  spread: "M4 18 9 12l4 3 7-8 M15 7h5v5",
};

export function Icon({ id, className }: { id: IconId; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[id] || P.history} />
    </svg>
  );
}
