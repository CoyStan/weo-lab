/**
 * Whether a change helps or hurts a goal, told the way the goal cards tell a status: a
 * square marker plus a word, so it never rests on colour alone. Filled square = helps,
 * hollow square = hurts, nothing = neither. The direction of the change is a separate
 * matter: the triangle beside it is always set in ink.
 */
export type Tone = "good" | "bad" | "neutral";

export function Valence({ tone, label, word = true }: { tone: Tone; label?: string; word?: boolean }) {
  if (tone === "neutral") return null;
  const text = label ?? (tone === "good" ? "helps" : "hurts");
  return (
    <span className={`game-valence is-${tone}`} title={tone === "good" ? "Helps a goal" : "Hurts a goal"}>
      <span className="game-valence-mark" aria-hidden="true" />
      {word ? <span>{text}</span> : <span className="sr-only">{text}</span>}
    </span>
  );
}
