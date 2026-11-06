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
              <div className="flex flex-col leading-tight">
                <strong className="text-[0.8rem]">{who.name}</strong>
                <span className="text-[0.75rem] text-[var(--lab-ink-2)]">{who.role}</span>
              </div>
              <p className="game-advice-text">
                <strong className="game-advice-lead">{lead(a.text)}</strong> {a.text.slice(lead(a.text).length).trim()}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** The first sentence: the advisor's verdict, set in bold so a glance is enough. */
function lead(text: string): string {
  const m = text.match(/^.*?[.!?](\s|$)/);
  return m ? m[0].trim() : text;
}
