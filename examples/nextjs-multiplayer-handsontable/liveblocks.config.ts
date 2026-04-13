import type { LiveList } from "@liveblocks/client";

export const GRID_ROWS = 30;
export const GRID_COLS = 18;

export const DEFAULT_COL_WIDTH = 40;
export const DEFAULT_ROW_HEIGHT = 28;

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
      columnWidths: LiveList<number>;
      rowHeights: LiveList<number>;
    };
  }
}
