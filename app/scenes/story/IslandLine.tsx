"use client";

// The island view's one line: the same biggest pushes the cause-and-effect map draws, read
// from the map's own story (model.ts headline), with the goal, the quarter, units, and when
// the player's own push lands, e.g.
// "Inflation, 2026Q1: food price surge ▲ +2.4 pp · your rate hike ▼ −0.07 pp, then −1.0 pp by 2027Q4".

import { headline, metricLabel, pushSize, signed, unitWord, type HeadPush } from "./model";
import { useStoryShown } from "./shown";

/** "Food price surge" → "food price surge" mid-sentence; "IMF …" keeps its capitals. */
const lower = (s: string) => (s.length > 1 && s[1] === s[1].toUpperCase() && /[A-Z]/.test(s[1]) ? s : s[0].toLowerCase() + s.slice(1));

export default function StoryIslandLine() {
  const story = useStoryShown((s) => s.story);
  const T = useStoryShown((s) => s.T);
  const max = useStoryShown((s) => s.max);
  if (!story) return null;
  const { top, mine } = headline(story, T, max);
  const lead = top ?? mine;
  if (!lead) return null;
  const part = (p: HeadPush, named: boolean) => (
    <span className="game-scene-islandline-part">
      {lower(p.cause.title)}{" "}
      <b className={`is-${p.tone}`}>
        {p.value >= 0 ? "▲" : "▼"} {named ? `${p.goal} ` : ""}
        {pushSize(p.value, p.metric)}
        {unitWord(p.metric).trim() === "pp" ? " pp" : ""}
      </b>
      {p.later ? (
        <span className="game-scene-islandline-when">
          , then {signed(p.later.value, Math.abs(p.later.value) < 0.095 && Math.abs(p.later.value) >= 0.005 ? 2 : 1)}
          {unitWord(p.metric)} by {p.later.label}
        </span>
      ) : null}
    </span>
  );
  return (
    <p className="game-scene-islandline">
      <span className="game-scene-islandline-key">
        {metricLabel(lead.metric)}, {story.labels[T] ?? ""}:
      </span>{" "}
      {top ? part(top, false) : null}
      {top && mine ? <span aria-hidden="true"> · </span> : null}
      {mine ? part(mine, Boolean(top) && mine.metric !== top!.metric) : null}
    </p>
  );
}
