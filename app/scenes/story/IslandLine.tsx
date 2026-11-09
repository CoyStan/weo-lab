"use client";

// The island view's one line: the same biggest pushes the cause-and-effect map draws, read
// from the map's own story (model.ts headline), with the goal, the quarter, units, a word
// for helps or hurts, and when the player's own push lands, e.g.
// "Inflation, 2026Q1: food price surge ▲ +2.4 pp, hurts · your rate hike lands later: ▼ −0.3 pp by 2027Q4, helps".
// Pushes under 0.05 pp are left out: the line never talks about what barely matters.

import { headline, metricLabel, pushSize, unitWord, type HeadPush, type MetricId } from "./model";
import { useStoryShown } from "./shown";

/** "Food price surge" → "food price surge" mid-sentence; "IMF …" keeps its capitals. */
const lower = (s: string) => (s.length > 1 && s[1] === s[1].toUpperCase() && /[A-Z]/.test(s[1]) ? s : s[0].toLowerCase() + s.slice(1));
/** "▲ +2.4 pp", "▼ −30 bp": the arrow, the signed size and its unit. */
const amount = (v: number, m: MetricId) => `${v >= 0 ? "▲" : "▼"} ${pushSize(v, m)}${unitWord(m) === " pp" ? " pp" : ""}`;
const word = (tone: "good" | "bad") => (tone === "good" ? "helps" : "hurts");

export default function StoryIslandLine() {
  const story = useStoryShown((s) => s.story);
  const T = useStoryShown((s) => s.T);
  const max = useStoryShown((s) => s.max);
  if (!story) return null;
  const { top, mine } = headline(story, T, max);
  const lead = top ?? mine;
  if (!lead)
    return (
      <p className="game-scene-islandline">
        <span className="game-scene-islandline-key">{story.labels[T] ?? ""}:</span> nothing is pushing your goals by as much as 0.05 pp yet.
      </p>
    );
  const push = (v: number, m: MetricId, tone: "good" | "bad") => <b className={`is-${tone}`}>{amount(v, m)}</b>;
  const outside = (p: HeadPush) => (
    <span className="game-scene-islandline-part">
      {lower(p.cause.title)} {push(p.value, p.metric, p.tone)}, {word(p.tone)}
    </span>
  );
  const own = (p: HeadPush) => {
    // The goal is named when it is not the one the line leads with.
    const goal = top && p.metric !== top.metric ? `${p.goal} ` : "";
    const later = p.later && p.later.label ? p.later : null;
    if (p.small && later)
      return (
        <span className="game-scene-islandline-part">
          {lower(p.cause.title)} lands later: {goal}
          {push(later.value, p.metric, later.tone)} by {later.label}, {word(later.tone)}
        </span>
      );
    const same = !later || later.tone === p.tone;
    return (
      <span className="game-scene-islandline-part">
        {lower(p.cause.title)}
        {goal ? `: ${goal}` : " "}
        {push(p.value, p.metric, p.tone)} now{same ? "" : `, ${word(p.tone)}`}
        {later ? (
          <span className="game-scene-islandline-when">
            , {amount(later.value, p.metric)} by {later.label}
          </span>
        ) : null}
        , {word(later ? later.tone : p.tone)}
      </span>
    );
  };
  return (
    <p className="game-scene-islandline">
      <span className="game-scene-islandline-key">
        {metricLabel(lead.metric)}, {story.labels[T] ?? ""}:
      </span>{" "}
      {top ? outside(top) : null}
      {top && mine ? <span aria-hidden="true"> · </span> : null}
      {mine ? own(mine) : null}
    </p>
  );
}
