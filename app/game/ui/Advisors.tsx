"use client";

import { useMemo } from "react";
import { ADVISORS, advise, type Advice } from "../advisors";
import { useTurn } from "../useTurn";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Live advice: it updates as levers move, because it reads the forecast. */
export default function Advisors({ compact = false }: { compact?: boolean }) {
  const { mission, actual, forecast, policy, clock } = useTurn();
  const advice = useMemo(() => advise({ mission, now: actual[clock], forecast, policy }), [mission, actual, forecast, policy, clock]);
  return <AdviceList advice={advice} compact={compact} />;
}

export function AdviceList({ advice, compact = false }: { advice: Advice[]; compact?: boolean }) {
  return (
    <ul className={`game-advisors ${compact ? "is-compact" : ""}`} aria-label="Advisors">
      {advice.map((a) => {
        const who = ADVISORS[a.advisor];
        return (
          <li key={a.advisor} className={`game-advice is-${a.tone}`} style={{ ["--advisor" as string]: who.accent }}>
            <img src={`${base}${who.portrait}`} alt="" width={44} height={44} className="game-portrait" />
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <strong className="text-[0.74rem]">{who.name}</strong>
                <span className="truncate text-[0.62rem] text-[var(--lab-ink-2)]">{who.role}</span>
              </div>
              <p className="game-advice-text">{a.text}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
