/** Longest project name, in characters (after trimming). */
export const PROJECT_NAME_MAX = 100;

/** Name of the board every new project starts with. It can be renamed later. */
export const DEFAULT_BOARD_NAME = "Main board";

/** Lists every new board starts with, in order. `position` is the 1-based index. Only Done is Finished. */
export const DEFAULT_LISTS = [
  { name: "To do", isFinished: false },
  { name: "In progress", isFinished: false },
  { name: "Done", isFinished: true },
] as const;
