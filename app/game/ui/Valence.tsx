/**
 * Whether a change helps or hurts a goal, told the way the goal cards tell a status: a
 * square marker plus a word, so it never rests on colour alone. One marker shape per
 * meaning: a filled square = helps (and "on track"), a half-filled square = at risk, a
 * hollow square = hurts (and "missed"), nothing = neither. The direction of the change is
 * a separate matter: the triangle beside it is always set in ink.
 */
export type Tone = "good" | "warn" | "bad" | "neutral";

const WORD: Record<Exclude<Tone, "neutral">, string> = { good: "helps", warn: "at risk", bad: "hurts" };
const TITLE: Record<Exclude<Tone, "neutral">, string> = { good: "Helps a goal", warn: "Puts a goal at risk", bad: "Hurts a goal" };

export function Valence({ tone, label, word = true }: { tone: Tone; label?: string; word?: boolean }) {
  if (tone === "neutral") return null;
  const text = label ?? WORD[tone];
  return (
    <span className={`game-valence is-${tone}`} title={TITLE[tone]}>
      <span className="game-valence-mark" aria-hidden="true" />
      {word ? <span>{text}</span> : <span className="sr-only">{text}</span>}
    </span>
  );
}
