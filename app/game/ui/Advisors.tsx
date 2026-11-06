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
            <div className="min-w-0 flex-1">
              <div className="flex w-full items-start justify-between gap-2">
                <span className="flex flex-col leading-tight">
                  <strong className="text-(length:--t-xs)">{who.name}</strong>
                  <span className="text-(length:--t-xs) text-[var(--lab-ink-2)]">{who.role}</span>
                </span>
                <span className={`game-stance is-${a.tone}`}>{STANCE[a.tone]}</span>
              </div>
              <p className="game-advice-text">{emphasise(a.text)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** A one-word stance a room can read at a glance. */
const STANCE: Record<string, string> = { worried: "Worried", calm: "Steady", pleased: "Pleased" };

/** Bold the numbers in the advice: they carry the argument. */
function emphasise(text: string) {
  return text.split(/(−?-?\d+(?:\.\d+)?%?(?:\s?pp)?(?: by \d{4}Q\d)?)/).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
}
