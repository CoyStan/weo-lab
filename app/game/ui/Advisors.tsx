"use client";

import { useMemo, useState } from "react";
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
              <AdviceText text={a.text} compact={compact} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The lead, one complete sentence, always shown in full; the rest of the note
 * appears on "More", and "More" only exists when there is more.
 */
function AdviceText({ text, compact }: { text: string; compact: boolean }) {
  const [open, setOpen] = useState(false);
  const { lead, rest } = splitLead(text);
  const more = !compact && rest.length > 0;
  return (
    <>
      <p className="game-advice-text">
        {emphasise(lead)}
        {more && open ? <> {emphasise(rest)}</> : null}
      </p>
      {more ? (
        <button type="button" className="game-why" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "Less" : "More"}
        </button>
      ) : null}
    </>
  );
}

/**
 * Split a note into a lead (its first complete sentence) and the rest. A first sentence
 * longer than about 90 characters breaks at its semicolon instead, so the lead stays short
 * enough to read from across a room and is never cut mid-word.
 */
export function splitLead(text: string): { lead: string; rest: string } {
  const m = text.match(/^(.+?[.!?])(?:\s+)([\s\S]*)$/);
  let lead = m ? m[1] : text.trim();
  let rest = m ? m[2].trim() : "";
  const semi = lead.indexOf("; ");
  if (lead.length > 90 && semi > 20) {
    const tail = lead.slice(semi + 2);
    rest = `${tail.charAt(0).toUpperCase()}${tail.slice(1)} ${rest}`.trim();
    lead = `${lead.slice(0, semi)}.`;
  }
  return { lead, rest };
}

/** A one-word stance a room can read at a glance. */
const STANCE: Record<string, string> = { worried: "Worried", calm: "Steady", pleased: "Pleased" };

/** Bold the numbers in the advice: they carry the argument. */
function emphasise(text: string) {
  return text.split(/(−?-?\d+(?:\.\d+)?%?(?:\s?pp)?(?: by \d{4}Q\d)?)/).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
}

/**
 * The recap's "Reaction" line, under the headline: one short quote from each advisor, with
 * portrait and mood (a square marker and a word), as a paper quotes its sources.
 */
export function Reactions({ advice }: { advice: Advice[] }) {
  if (!advice.length) return null;
  return (
    <section className="game-reactions" aria-label="Reaction">
      <h3 className="game-reactions-title">Reaction</h3>
      <ul>
        {advice.slice(0, 2).map((a) => {
          const who = ADVISORS[a.advisor];
          return (
            <li key={a.advisor} className={`game-reaction is-${a.tone}`}>
              <img src={`${base}${who.portrait}`} alt="" width={40} height={40} className="game-portrait" />
              <div className="min-w-0">
                <p className="game-reaction-who">
                  <strong>{who.name}</strong>{" "}
                  <span className={`game-reaction-mood is-${a.tone}`}>
                    <i aria-hidden="true" />
                    {STANCE[a.tone]}
                  </span>
                </p>
                <p className="game-reaction-quote">&ldquo;{splitLead(a.text).lead}&rdquo;</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
