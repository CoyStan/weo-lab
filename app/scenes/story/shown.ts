import { create } from "zustand";
import type { Story } from "./model";

/**
 * What the cause-and-effect map is showing: its story, the quarter picked on its strip, and
 * how many arrows it draws. The map publishes it; the island view reads it to name the same
 * pushes in one line, without building the story a second time.
 */
export const useStoryShown = create<{ story: Story | null; T: number; max: number }>(() => ({ story: null, T: 0, max: 8 }));
