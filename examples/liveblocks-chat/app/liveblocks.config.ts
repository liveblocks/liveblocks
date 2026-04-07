import type { LiveList, LiveObject } from "@liveblocks/client";

export type RowData = Record<string, string> & { id: string };

export type Storage = {
  title: string;
  columns: LiveList<string>;
  rows: LiveList<LiveObject<RowData>>;
};

declare global {
  interface Liveblocks {
    Storage: Storage;

    /** Shown for the bot via @liveblocks/node setPresence (optional for human users). */
    Presence: {
      aiStatus?: string;
      /** First row (0-based) of the span the bot is working on. */
      aiFocusedRowIndex?: number;
      /** Inclusive end when multiple rows are affected; omit for a single row. */
      aiFocusedRowIndexEnd?: number;
    };

    UserMeta: {
      info: {
        name: string;
        color: string;
        avatar?: string;
      };
    };

    ThreadMetadata: {
      source?: "slack" | "liveblocks";
      channelName?: string;
    };
  }
}

export {};
