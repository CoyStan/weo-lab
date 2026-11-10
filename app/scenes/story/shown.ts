import { create } from "zustand";
import type { ObjectiveStatus } from "../../game/missions";
import type { MetricId, Story } from "./model";

/** Goals in trouble, from the same statuses the goals panel shows. */
export type Trouble = Partial<Record<MetricId, "at-risk" | "failed">>;

/**
 * Each goal's status as the goals panel gives it: the status, its word ("at risk"), the figure that decides it
 * with the panel's name for that quarter ("low point 1.4% in 2026Q4"), the same without the name ("1.4% in
 * 2026Q4") and the goal itself ("goal ≥ 1.5%").
 */
export type GoalStatus = Partial<Record<MetricId, { status: ObjectiveStatus; word: string; detail: string; level: string; target: string }>>;

/**
 * What the cause-and-effect map is showing: its story, the quarter picked on its strip, how
 * many arrows it draws, which goals are in trouble and how each goal fares. The map publishes
 * it; the island view reads it to name the same pushes in one line, without building the story
 * a second time.
 */
export const useStoryShown = create<{
  story: Story | null;
  T: number;
  max: number;
  /** The map is in its goal-by-goal list layout (narrow or short slot). */
  list: boolean;
  trouble: Trouble;
  status: GoalStatus;
  /** Each tag's figure as the map rounds it ("food-price|infl" → 2.3), so the island's line says the same number. */
  rounded: Record<string, number>;
}>(() => ({
  story: null,
  T: 0,
  max: 8,
  list: false,
  trouble: {},
  status: {},
  rounded: {},
}));
