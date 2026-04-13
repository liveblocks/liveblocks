import type { LiveList } from "@liveblocks/client";

export const GRID_ROWS = 30;
export const GRID_COLS = 18;

export type PresenceCell = {
  row: number;
  col: number;
};

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
    Presence: {
      selectedCell: PresenceCell | null;
    };
    Storage: {
      grid: LiveList<LiveList<string>>;
    };
  }
}
