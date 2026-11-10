"use client";

// The island view's one line: the same pushes the cause-and-effect map draws, read from the
// map's own story (model.ts), with the goal, the quarters compared, units, a word for helps or
// hurts, and when the player's own push lands. The pushes are totals since the mission's start,
// and the key says so ("2026Q1 vs 2025Q4:"), so they never read as this quarter's.
//
// When a goal is at risk or off track, the line is about that goal, as the goals panel and the
// island's tags are. It leads with the goal's level against the goal, as the panel judges it,
// then its biggest push and the player's own there, what the player's move does for another goal,
// and the biggest outside shock, e.g.
// "Growth at risk: 1.4% in 2026Q4, goal ≥ 1.5%. 2026Q1 vs 2025Q4: the economy's own drift
// ▼ −0.4 pp, hurts · your rate hike ▼ −0.2 pp in 2026Q1, ▼ −0.8 pp at worst in 2026Q4, hurts ·
// it also moves inflation ▼ −1.0 pp by 2027Q4, helps · food price surge ▲ +2.4 pp on inflation, hurts".
// Otherwise it leads with the biggest push. Pushes under 0.05 pp are left out: the line never
// talks about what barely matters.

import { causeTotal, goalPushes, headline, matters, metricLabel, metricRef, pushSize, unitWord, type GoalPush, type HeadPush, type MetricId, type Story } from "./model";
import { useStoryShown } from "./shown";
import "./story.css";

/** "Food price surge" → "food price surge" mid-sentence; "IMF …" keeps its capitals; the drift says whose it is. */
const lowerTitle = (s: string) => (s.length > 1 && s[1] === s[1].toUpperCase() && /[A-Z]/.test(s[1]) ? s : s[0].toLowerCase() + s.slice(1));
const lower = (p: HeadPush) => (p.cause.kind === "momentum" ? "the economy's own drift" : lowerTitle(p.cause.title));
/** "▲ +2.4 pp", "▼ −30 bp": the arrow, the signed size and its unit. */
const amount = (v: number, m: MetricId) => `${v >= 0 ? "▲" : "▼"} ${pushSize(v, m)}${unitWord(m) === " pp" ? " pp" : ""}`;
const word = (tone: "good" | "bad") => (tone === "good" ? "helps" : "hurts");

/** The biggest push from an outside shock on any of the mission's goals at quarter t, when it is worth a word. */
function biggestShock(story: Story, t: number): { title: string; metric: MetricId; value: number; tone: "good" | "bad"; cause: string } | null {
  let best: { title: string; metric: MetricId; value: number; tone: "good" | "bad"; cause: string } | null = null;
  for (const c of story.causes) {
    if (c.kind !== "shock") continue;
    for (const o of story.outcomes) {
      if (!o.goal) continue;
      const v = causeTotal(story, c.id, o.metric, t);
      if (!matters(v, o.metric)) continue;
      if (!best || Math.abs(v) / metricRef(o.metric) > Math.abs(best.value) / metricRef(best.metric))
        best = { title: lowerTitle(c.title), metric: o.metric, value: v, tone: Math.sign(v) === o.good(t) ? "good" : "bad", cause: c.id };
    }
  }
  return best;
}

export default function StoryIslandLine() {
  const story = useStoryShown((s) => s.story);
  const T = useStoryShown((s) => s.T);
  const max = useStoryShown((s) => s.max);
  const trouble = useStoryShown((s) => s.trouble);
  const status = useStoryShown((s) => s.status);
  // The figures as the map rounds its tags, so a push reads the same number in both views.
  const rounded = useStoryShown((s) => s.rounded);
  const val = (p: { cause: { id: string }; metric: MetricId; value: number }) => rounded[`${p.cause.id}|${p.metric}`] ?? p.value;
  if (!story) return null;
  const since = `${story.labels[T] ?? ""} vs ${story.labels[0] ?? ""}`;
  const inT = `in ${story.labels[T] ?? ""}`;
  const push = (v: number, m: MetricId, tone: "good" | "bad") => <b className={`is-${tone}`}>{amount(v, m)}</b>;
  const when = (text: string) => <span className="game-scene-islandline-when">{text}</span>;
  const sep = <span aria-hidden="true"> · </span>;
  const outside = (p: HeadPush) => (
    <span className="game-scene-islandline-part">
      {lower(p)} {push(val(p), p.metric, p.tone)}, {word(p.tone)}
    </span>
  );
  // "Growth at risk: 1.4% in 2026Q4, goal ≥ 1.5%." The goal's level as the goals panel judges it.
  const lead = (m: MetricId, fallback: string) => {
    const st = status[m];
    if (!st) return <span className="game-scene-islandline-key">{fallback}</span>;
    return (
      <span className="game-scene-islandline-key">
        {metricLabel(m)} {st.word}
        {st.level ? `: ${st.level}, ${st.target}` : `, ${st.target}`}.
      </span>
    );
  };
  // The biggest outside shock on a goal, unless the line already names it there.
  const shockPart = (named: { cause: string; metric: MetricId }[]) => {
    const sh = biggestShock(story, T);
    if (!sh || named.some((x) => x.cause === sh.cause && x.metric === sh.metric)) return null;
    // On a phone the line keeps to the goal in trouble and the player's own move: the shock is in the map's list.
    return (
      <span className="game-scene-islandline-extra">
        {sep}
        <span className="game-scene-islandline-part">
          {sh.title} {push(rounded[`${sh.cause}|${sh.metric}`] ?? sh.value, sh.metric, sh.tone)} on {metricLabel(sh.metric).toLowerCase()}, {word(sh.tone)}
        </span>
      </span>
    );
  };

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
            {lower(p)} lands later: {push(far.value, p.metric, far.tone)} {when(at)}, {word(far.tone)}
          </span>
        );
      return (
        <span className="game-scene-islandline-part">
          {lower(p)} {push(val(p), p.metric, p.tone)} {inT}
          {far ? (
            <>
              {far.tone === p.tone ? "" : `, ${word(p.tone)}`}, {push(far.value, p.metric, far.tone)} {when(at)}, {word(far.tone)}
            </>
          ) : (
            <>, {word(p.tone)}</>
          )}
        </span>
      );
    };
    // What the player's move does for another goal, when it helps there: the payoff of the move that hurts here.
    const { mine } = headline(story, T, max);
    const ownHere = pushes.find((p) => p.cause.kind === "lever");
    const payoff =
      mine && mine.metric !== worry && mine.later && mine.later.tone === "good" ? (
        <>
          {sep}
          <span className="game-scene-islandline-part">
            {ownHere && ownHere.cause.id === mine.cause.id ? "it" : lower(mine)} also moves {mine.goal} {push(mine.later.value, mine.metric, "good")} {when(`by ${mine.later.label}`)}, helps
          </span>
        </>
      ) : null;
    const named = [...pushes.map((p) => ({ cause: p.cause.id, metric: p.metric })), ...(payoff && mine ? [{ cause: mine.cause.id, metric: mine.metric }] : [])];
    return (
      <p className="game-scene-islandline">
        {lead(worry, `${metricLabel(worry)} ${trouble[worry] === "failed" ? "off track" : "at risk"}.`)} <span className="game-scene-islandline-since">{since}:</span>{" "}
        {pushes.map((p, i) => (
          <span key={p.cause.id}>
            {i ? sep : null}
            {p.cause.kind === "lever" ? own(p) : outside(p)}
          </span>
        ))}
        {payoff}
        {shockPart(named)}
      </p>
    );
  }

  const { top, mine } = headline(story, T, max);
  const first = top ?? mine;
  if (!first)
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
          {push(later.value, p.metric, later.tone)} {when(`by ${later.label}`)}, {word(later.tone)}
        </span>
      );
    const same = !later || later.tone === p.tone;
    return (
      <span className="game-scene-islandline-part">
        {lower(p)}
        {goal ? `: ${goal}` : " "}
        {push(val(p), p.metric, p.tone)} {inT}
        {same ? "" : `, ${word(p.tone)}`}
        {later ? (
          <>
            , {push(later.value, p.metric, later.tone)} {when(`by ${later.label}`)}
          </>
        ) : null}
        , {word(later ? later.tone : p.tone)}
      </span>
    );
  };
  const named = [...(top ? [{ cause: top.cause.id, metric: top.metric }] : []), ...(mine ? [{ cause: mine.cause.id, metric: mine.metric }] : [])];
  return (
    <p className="game-scene-islandline">
      {lead(first.metric, `${metricLabel(first.metric)},`)} <span className="game-scene-islandline-since">{since}:</span> {top ? outside(top) : null}
      {top && mine ? sep : null}
      {mine ? own(mine) : null}
      {shockPart(named)}
    </p>
  );
}
