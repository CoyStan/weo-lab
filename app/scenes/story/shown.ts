import { create } from "zustand";
import type { MetricId, Story } from "./model";

/** Goals in trouble, from the same statuses the goals panel shows. */
export type Trouble = Partial<Record<MetricId, "at-risk" | "failed">>;

/**
 * What the cause-and-effect map is showing: its story, the quarter picked on its strip, how
 * many arrows it draws, and which goals are in trouble. The map publishes it; the island view
 * reads it to name the same pushes in one line, without building the story a second time.
 */
export const useStoryShown = create<{
  story: Story | null;
  T: number;
  max: number;
  /** The map is in its goal-by-goal list layout (narrow or short slot). */
  list: boolean;
  trouble: Trouble;
}>(() => ({
  story: null,
  T: 0,
  max: 8,
  list: false,
  trouble: {},
}));
