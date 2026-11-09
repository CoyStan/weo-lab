"use client";

// The island view's one line: the same biggest pushes the cause-and-effect map draws,
// read from the map's own story (model.ts headline), e.g.
// "Biggest push: Food price surge ▲ inflation +2.4 · your rate hike ▼ −0.07 now".

import { headline, pushSize, type HeadPush } from "./model";
import { useStoryShown } from "./shown";

export default function StoryIslandLine() {
  const story = useStoryShown((s) => s.story);
  const T = useStoryShown((s) => s.T);
  const max = useStoryShown((s) => s.max);
  if (!story) return null;
  const { top, mine } = headline(story, T, max);
  if (!top && !mine) return null;
  const when = T === story.clock + 1 ? "now" : `in ${story.labels[T] ?? ""}`;
  const part = (p: HeadPush, own: boolean, named: boolean) => (
    <span className="game-scene-islandline-part">
      {own ? p.cause.title.replace(/^Your\b/, "your") : p.cause.title}{" "}
      <b className={`is-${p.tone}`}>
        {p.value >= 0 ? "▲" : "▼"} {named ? `${p.goal} ` : ""}
        {pushSize(p.value, p.metric)}
      </b>
    </span>
  );
  return (
    <p className="game-scene-islandline">
      <span className="game-scene-islandline-key">Biggest push:</span> {top ? part(top, false, true) : null}
      {top && mine ? <span aria-hidden="true"> · </span> : null}
      {mine ? part(mine, true, !top || mine.metric !== top.metric) : null} <span className="game-scene-islandline-when">{when}</span>
    </p>
  );
}
