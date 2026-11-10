"use client";

// The island view's one line: the same pushes the cause-and-effect map draws, read from the
// map's own story (model.ts), with the goal, the quarters compared, units, a word for helps or
// hurts, and when the player's own push lands. The pushes are totals since the mission's start,
// and the key says so ("Inflation, 2026Q1 vs 2025Q4:"), so they never read as this quarter's.
//
// When a goal is at risk or off track, the line is about that goal, as the goals panel and the
// island's tags are: its biggest push and the player's own there, e.g.
// "Growth at risk, 2026Q1 vs 2025Q4: the economy's own drift ▼ −0.4 pp, hurts · your rate hike
// ▼ −0.2 pp now, ▼ −0.8 pp at worst in 2026Q4, hurts". Otherwise it leads with the biggest push:
// "Inflation, 2026Q1 vs 2025Q4: food price surge ▲ +2.4 pp, hurts · your rate hike ▼ −0.07 pp now, ▼ −1.0 pp by 2027Q4, helps".
// Pushes under 0.05 pp are left out: the line never talks about what barely matters.

import { goalPushes, headline, metricLabel, pushSize, unitWord, type GoalPush, type HeadPush, type MetricId } from "./model";
import { useStoryShown } from "./shown";

/** "Food price surge" → "food price surge" mid-sentence; "IMF …" keeps its capitals; the drift says whose it is. */
const lower = (p: HeadPush) => {
  if (p.cause.kind === "momentum") return "the economy's own drift";
  const s = p.cause.title;
  return s.length > 1 && s[1] === s[1].toUpperCase() && /[A-Z]/.test(s[1]) ? s : s[0].toLowerCase() + s.slice(1);
};
/** "▲ +2.4 pp", "▼ −30 bp": the arrow, the signed size and its unit. */
const amount = (v: number, m: MetricId) => `${v >= 0 ? "▲" : "▼"} ${pushSize(v, m)}${unitWord(m) === " pp" ? " pp" : ""}`;
const word = (tone: "good" | "bad") => (tone === "good" ? "helps" : "hurts");

export default function StoryIslandLine() {
  const story = useStoryShown((s) => s.story);
  const T = useStoryShown((s) => s.T);
  const max = useStoryShown((s) => s.max);
  const trouble = useStoryShown((s) => s.trouble);
  if (!story) return null;
  const since = `${story.labels[T] ?? ""} vs ${story.labels[0] ?? ""}`;
  const push = (v: number, m: MetricId, tone: "good" | "bad") => <b className={`is-${tone}`}>{amount(v, m)}</b>;
  const outside = (p: HeadPush) => (
    <span className="game-scene-islandline-part">
      {lower(p)} {push(p.value, p.metric, p.tone)}, {word(p.tone)}
    </span>
  );

  // A goal in trouble leads: off track first, then at risk, in the map's order.
  const rank = (m: MetricId) => (trouble[m] === "failed" ? 0 : 1);
  const worry = story.outcomes
    .map((o) => o.metric)
    .filter((m) => trouble[m])
    .sort((a, b) => rank(a) - rank(b))[0];
  const pushes = worry ? goalPushes(story, T, worry) : [];
  if (worry && pushes.length) {
    const own = (p: GoalPush) => {
      const far = p.extreme;
      const at = far ? `${far.tone === "bad" ? "at worst" : "at best"} in ${far.label}` : "";
      if (p.small && far)
        return (
          <span className="game-scene-islandline-part">
            {lower(p)} lands later: {push(far.value, p.metric, far.tone)} {at}, {word(far.tone)}
          </span>
        );
      return (
        <span className="game-scene-islandline-part">
          {lower(p)} {push(p.value, p.metric, p.tone)}
          {far ? (
            <>
              {" "}
              now{far.tone === p.tone ? "" : `, ${word(p.tone)}`}
              <span className="game-scene-islandline-when">
                , {amount(far.value, p.metric)} {at}
              </span>
              , {word(far.tone)}
            </>
          ) : (
            <>, {word(p.tone)}</>
          )}
        </span>
      );
    };
    return (
      <p className="game-scene-islandline">
        <span className="game-scene-islandline-key">
          {metricLabel(worry)} {trouble[worry] === "failed" ? "off track" : "at risk"}, {since}:
        </span>{" "}
        {pushes.map((p, i) => (
          <span key={p.cause.id}>
            {i ? <span aria-hidden="true"> · </span> : null}
            {p.cause.kind === "lever" ? own(p) : outside(p)}
          </span>
        ))}
      </p>
    );
  }

  const { top, mine } = headline(story, T, max);
  const lead = top ?? mine;
  if (!lead)
    return (
      <p className="game-scene-islandline">
        <span className="game-scene-islandline-key">{since}:</span> nothing is pushing your goals by as much as 0.05 pp yet.
      </p>
    );
  const own = (p: HeadPush) => {
    // The goal is named when it is not the one the line leads with.
    const goal = top && p.metric !== top.metric ? `${p.goal} ` : "";
    const later = p.later && p.later.label ? p.later : null;
    if (p.small && later)
      return (
        <span className="game-scene-islandline-part">
          {lower(p)} lands later: {goal}
          {push(later.value, p.metric, later.tone)} by {later.label}, {word(later.tone)}
        </span>
      );
    const same = !later || later.tone === p.tone;
    return (
      <span className="game-scene-islandline-part">
        {lower(p)}
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
        {metricLabel(lead.metric)}, {since}:
      </span>{" "}
      {top ? outside(top) : null}
      {top && mine ? <span aria-hidden="true"> · </span> : null}
      {mine ? own(mine) : null}
    </p>
  );
}
