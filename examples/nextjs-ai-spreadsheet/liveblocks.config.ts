import type { LiveList, LiveMap, LiveObject } from "@liveblocks/client";

// Initial grid size. Rows and columns are addressed by stable ids (see below),
// so these are only the *starting* dimensions — rows/columns can be inserted,
// deleted, moved, and sorted afterwards.
export const DEFAULT_ROWS = 50;
export const DEFAULT_COLS = 26;

export const DEFAULT_COL_WIDTH = 110;
export const DEFAULT_ROW_HEIGHT = 28;
export const MIN_COL_WIDTH = 40;
export const MIN_ROW_HEIGHT = 22;

export type NumberFormat = "general" | "currency" | "percent";

// Per-cell formatting, written by the toolbar and the AI's `formatCells` tool.
export type CellFormat = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  align?: "left" | "center" | "right";
  // Hex colors, e.g. "#ef4444".
  color?: string;
  background?: string;
  numberFormat?: NumberFormat;
};

export type CellData = {
  value: string;
  format?: CellFormat;
};

// JSON-safe value types, used for tool-call inputs stored in feed messages.
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

export type SelectedCell = {
  rowId: string;
  colId: string;
};

// `cells` is a sparse map keyed by the stable row and column ids. A cell only
// exists in Storage once it has a value or formatting.
export function cellKey(rowId: string, colId: string): string {
  return `${rowId}:${colId}`;
}

declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key.
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        avatar: string;
      };
    };

    // Realtime presence, shared with everyone in the room.
    Presence: {
      // The cells a user (or the AI, via server-side `setPresence`) is currently
      // editing. Keyed by stable ids so the highlight follows the logical cells
      // even when rows/columns are moved or sorted. Humans only ever publish a
      // single (active) cell, but the AI publishes every cell of a multi-cell
      // edit so the whole region is highlighted as one box while it works.
      selectedCells: SelectedCell[] | null;
      // The feed (chat) the user is currently prompting the AI in, so the live
      // "AI is thinking…" status shows in the right chat for everyone.
      promptingFeedId: string | null;
    };

    // Shared spreadsheet, addressed entirely by stable ids. `rowIds`/`colIds`
    // define the *order* everyone sees; reordering only touches these lists, so
    // values, formats, sizes, presence, and comments never need migrating.
    Storage: {
      rowIds: LiveList<string>;
      colIds: LiveList<string>;
      cells: LiveMap<string, LiveObject<CellData>>;
      colWidths: LiveMap<string, number>;
      rowHeights: LiveMap<string, number>;
    };

    // Comment threads are anchored to a logical cell, so they stay attached
    // through moves and sorts.
    ThreadMetadata: {
      rowId: string;
      colId: string;
    };

    // The shape of every message stored in a chat feed (see Chat.tsx). Mirrors
    // the realtime AI Elements example.
    FeedMessageData: {
      role: "user" | "assistant";
      content: string;
      userId?: string;
      name?: string;
      avatar?: string;
      model?: string;
      reasoning?: string;
      sources?: { title: string; url: string }[];
      suggestions?: string[];
      // Tools the assistant called this turn, rendered with the AI Elements
      // `Tool` component.
      tools?: {
        name: string;
        input: JsonObject;
        output?: string;
      }[];
      usedTokens?: number;
      maxTokens?: number;
      // True while the assistant message is still being streamed in via
      // `updateFeedMessage`. Cleared on the final update.
      streaming?: boolean;
    };

    // Custom metadata attached to a feed.
    FeedMetadata: {
      title?: string;
    };
  }
}

export {};
