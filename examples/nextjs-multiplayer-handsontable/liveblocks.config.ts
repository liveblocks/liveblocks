import type { LiveList } from "@liveblocks/client";

/** Spreadsheet dimensions (new rooms only; `grid` replaces legacy `rows` storage). */
export const GRID_ROWS = 30;
export const GRID_COLS = 18;

declare global {
  interface Liveblocks {
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        avatar: string;
      };
    };
    Presence: Record<string, never>;
    Storage: {
      grid: LiveList<LiveList<string>>;
    };
  }
}

export {};
