import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { Document, User } from "./types";

export type Note = LiveObject<{
  x: number;
  y: number;
  text: string;
  selectedBy: Liveblocks["UserMeta"]["info"] | null;
  id: string;
}>;

export type Notes = LiveMap<string, Note>;

export const GRID_ROWS = 100;
export const GRID_COLS = 26;

export const DEFAULT_COL_WIDTH = 120;
export const DEFAULT_ROW_HEIGHT = 28;

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      cursor: { x: number; y: number } | null; // Whiteboard
      presence: any; // Canvas
      selectedCell: { row: number; col: number } | null; // Spreadsheet
    };
    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: {
      notes: Notes; // Whiteboard
      records: LiveMap<string, any>; // Canvas
      cover: string | null; // Note
      icon: string | null; // Note
      title: string; // Note
      grid: LiveList<LiveList<string>>; // Spreadsheet
      columnWidths: LiveList<number>; // Spreadsheet
      rowHeights: LiveList<number>; // Spreadsheet
    };
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: Pick<User, "name" | "avatar" | "color">;
    };
    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent:
      | { type: "SHARE_DIALOG_UPDATE" }
      | { type: "DOCUMENT_NAME_UPDATE" };
    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: {
      highlightId?: string; // Text/Note
      rowId?: string; // Spreadsheet
      columnId?: string; // Spreadsheet
    };
    ActivitiesData: {
      $addedToDocument: {
        documentId: Document["id"];
      };
    };
  }
}

export function createInitialPresence(): Liveblocks["Presence"] {
  return {
    cursor: null, // Whiteboard
    presence: undefined, // Canvas
    selectedCell: null, // Spreadsheet
  };
}

export function createInitialStorage(): Liveblocks["Storage"] {
  return {
    notes: new LiveMap(), // Whiteboard
    records: new LiveMap(), // Canvas
    cover: null, // Note
    icon: null, // Note
    title: "", // Note
    grid: new LiveList(
      Array.from(
        { length: GRID_ROWS },
        () => new LiveList(Array.from({ length: GRID_COLS }, () => ""))
      )
    ), // Spreadsheet
    columnWidths: new LiveList(
      Array.from({ length: GRID_COLS }, () => DEFAULT_COL_WIDTH)
    ), // Spreadsheet
    rowHeights: new LiveList(
      Array.from({ length: GRID_ROWS }, () => DEFAULT_ROW_HEIGHT)
    ), // Spreadsheet
  };
}
