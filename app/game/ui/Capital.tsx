"use client";

import { useEffect, useRef, useState } from "react";
import { quarterLabel } from "../../model/economy";
import type { Cost, Currency } from "../politics";
import { useTurn } from "../useTurn";

export function VotesIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 8.5h11v5h-11zM5 8.5V3.5h6v5M6.5 6l1.2 1.2L10 4.8" />
    </svg>
  );
}

export function TrustIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2.5v11M4 13.5h8M2.5 5.5h11M4.5 5.5 2.5 9.5a2 2 0 0 0 4 0zM11.5 5.5l-2 4a2 2 0 0 0 4 0z" />
    </svg>
  );
}

export const CURRENCY_NAME: Record<Currency, string> = { votes: "Votes", trust: "Trust" };

export function CostChips({ cost }: { cost: Cost }) {
  return (
    <span className="inline-flex gap-1">
      {cost.votes ? (
        <span className="game-cost is-votes" title={`${cost.votes} votes`}>
          <VotesIcon size={12} /> {cost.votes}
        </span>
      ) : null}
      {cost.trust ? (
        <span className="game-cost is-trust" title={`${cost.trust} trust`}>
          <TrustIcon size={12} /> {cost.trust}
        </span>
      ) : null}
    </span>
  );
}

/** Votes and Trust, with a little float when they change, and the next election. */
export default function Capital() {
  const { books, mission, clock } = useTurn();
  if (!books) return null;
  const next = mission.politics.elections.find((q) => q > clock);
  return (
    <div className="flex items-center gap-1.5" aria-label="Political capital">
      <Counter currency="votes" value={books.votes} hint="Votes: your own electorate. Growth and jobs earn them; recessions, job losses, high inflation and austerity cost them. Spend them on reforms; keep enough for elections." />
      <Counter currency="trust" value={books.trust} hint="Trust: markets and partners. Inflation on target, falling debt and narrowing spreads earn it; missed promises cost it. If it falls to −3, markets turn on you." />
      {next ? (
        <span className={`game-election ${books.votes < mission.politics.threshold ? "is-risk" : ""}`} title={`You need at least ${mission.politics.threshold} votes when ${quarterLabel(next)} ends.`}>
          Election {quarterLabel(next)} · need {mission.politics.threshold}
        </span>
      ) : null}
    </div>
  );
}

function Counter({ currency, value, hint }: { currency: Currency; value: number; hint: string }) {
  const prev = useRef(value);
  const [delta, setDelta] = useState<{ v: number; key: number } | null>(null);
  useEffect(() => {
    const d = value - prev.current;
    prev.current = value;
    if (d !== 0) setDelta({ v: d, key: Date.now() });
  }, [value]);
  return (
    <span className={`game-counter is-${currency} ${value < 0 ? "is-negative" : ""}`} title={hint} aria-label={`${CURRENCY_NAME[currency]} ${value}`}>
      {currency === "votes" ? <VotesIcon /> : <TrustIcon />}
      <span className="max-sm:hidden">{CURRENCY_NAME[currency]}</span>
      <strong className="tabular-nums">{value}</strong>
      {delta ? (
        <span key={delta.key} className={`game-counter-float ${delta.v > 0 ? "is-up" : "is-down"}`} aria-hidden="true">
          {delta.v > 0 ? `+${delta.v}` : delta.v}
        </span>
      ) : null}
    </span>
  );
}
