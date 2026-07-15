import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import type { LsonObject } from "@liveblocks/client";
import type { Edge, Node } from "@xyflow/react";
import { nanoid } from "nanoid";
import { Document, DocumentType, User } from "./types";

export type Note = LiveObject<{
  x: number;
  y: number;
  text: string;
  selectedBy: Liveblocks["UserMeta"]["info"] | null;
  id: string;
}>;

export type Notes = LiveMap<string, Note>;

// ============================================================================
// Spreadsheet
//
// Initial grid size. Rows and columns are addressed by stable ids, so these
// are only the *starting* dimensions — rows/columns can be inserted, deleted,
// moved, and sorted afterwards.
export const SPREADSHEET_DEFAULT_ROWS = 50;
export const SPREADSHEET_DEFAULT_COLS = 26;

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

export type SelectedCell = {
  rowId: string;
  colId: string;
};

// `cells` is a sparse map keyed by the stable row and column ids. A cell only
// exists in Storage once it has a value or formatting.
export function cellKey(rowId: string, colId: string): string {
  return `${rowId}:${colId}`;
}

// JSON-safe value types, used for tool-call inputs stored in feed messages.
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

// ============================================================================
// Flowchart
//
// The diagram itself is synced by `@liveblocks/react-flow` under the `flow`
// Storage key. These node/edge types are shared between the client editor and
// the server-side AI agent.
export type BlockShape = "rectangle" | "ellipse" | "diamond";
export type BlockColor =
  | "blue"
  | "cyan"
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "pink"
  | "purple"
  | "gray";

export type FlowchartNodeData = {
  label: string;
  shape: BlockShape;
  color: BlockColor;
};

export type FlowchartEdgeData = {
  label: string;
};

export type FlowchartNode = Node<FlowchartNodeData, "block">;
export type FlowchartEdge = Edge<FlowchartEdgeData, "smoothstep">;

// ============================================================================
// Feeds (used by the spreadsheet, slideshow, and flowchart AI features)

// The shape of chat-style feed messages (spreadsheet + slideshow AI chats).
export type ChatFeedMessageData = {
  role: "user" | "assistant";
  content: string;
  userId?: string;
  name?: string;
  avatar?: string;
  model?: string;
  reasoning?: string;
  sources?: { title: string; url: string }[];
  suggestions?: string[];
  // Spreadsheet: tools the assistant called this turn, rendered with the AI
  // Elements `Tool` component.
  tools?: {
    name: string;
    input: JsonObject;
    output?: string;
  }[];
  // Slideshow: slide edits proposed by the assistant. `slideId` is an existing
  // slide's id, or "new" to append a new slide to the deck.
  proposals?: { slideId: string; html: string }[];
  proposalStatus?: "pending" | "applied" | "rejected";
  // Slideshow: step-by-step plan, rendered with the AI Elements `ChainOfThought`.
  chainOfThought?: {
    label: string;
    description?: string;
    status?: "complete" | "active" | "pending";
    search?: string[];
  }[];
  // Slideshow: a tool the assistant "called", rendered with `Tool` (+ `CodeBlock`).
  tool?: {
    name: string;
    input: Record<string, string | number>;
    output?: string;
  };
  // Token usage, rendered with the `Context` component.
  usedTokens?: number;
  maxTokens?: number;
  // True while the assistant message is still being streamed in via
  // `updateFeedMessage`. Cleared on the final update.
  streaming?: boolean;
};

// The shape of feed messages streamed by the flowchart comment agent.
export type FlowchartFeedMessageData =
  | {
      stage: "thinking";
      response: string;
      responsePart: string;
    }
  | {
      stage: "writing";
      response: string;
      responsePart: string;
    }
  | {
      stage: "complete";
      response: string;
      reasoning: string;
      thinkingTime: number;
    };

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      cursor: { x: number; y: number } | null; // Whiteboard + Slideshow
      presence: any; // Canvas
      // Spreadsheet: the cells a user (or the AI, via server-side
      // `setPresence`) is currently editing.
      selectedCells?: SelectedCell[] | null;
      // Spreadsheet + Slideshow: the feed (chat) the user is currently
      // prompting the AI in, so the live "AI is thinking…" status shows in the
      // right chat for everyone.
      promptingFeedId?: string | null;
      cursorSlideId?: string | null; // Slideshow
      selection?: { slideId: string; path: number[] } | null; // Slideshow
      thinking?: boolean; // Flowchart (AI agent presence)
    };
    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: {
      notes: Notes; // Whiteboard
      records: LiveMap<string, any>; // Canvas
      cover: string | null; // Note
      icon: string | null; // Note
      title: string; // Note
      // Spreadsheet: `rowIds`/`colIds` define the *order* everyone sees;
      // reordering only touches these lists, so values, formats, sizes,
      // presence, and comments never need migrating.
      rowIds: LiveList<string>;
      colIds: LiveList<string>;
      cells: LiveMap<string, LiveObject<CellData>>;
      colWidths: LiveMap<string, number>;
      rowHeights: LiveMap<string, number>;
      // Flowchart: managed by `@liveblocks/react-flow` (initialized lazily by
      // `useLiveblocksFlow`, hence optional). Structurally this is
      // `LiveblocksFlow<FlowchartNode, FlowchartEdge>`, but React Flow's
      // `Node`/`Edge` types aren't strict JSON, so a generic LSON shape is
      // declared here instead.
      flow?: LiveObject<{
        nodes: LiveMap<string, LiveObject<LsonObject>>;
        edges: LiveMap<string, LiveObject<LsonObject>>;
      }>;
      // App: the generated React code, streamed in by the AI copilot.
      code: string;
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
      highlightId?: string; // Text
      rowId?: string; // Spreadsheet (anchored to a logical cell)
      colId?: string; // Spreadsheet
      x?: number; // Slideshow + Flowchart (pin position)
      y?: number; // Slideshow + Flowchart
      zIndex?: number; // Slideshow
      slideId?: string; // Slideshow
      attachedToNodeId?: string; // Flowchart
    };
    // Custom metadata set on individual comments.
    CommentMetadata: {
      feedId?: string; // Flowchart (AI reply streamed into a feed)
      feedComplete?: boolean; // Flowchart
    };
    // The shape of every message stored in a chat feed.
    FeedMessageData: ChatFeedMessageData | FlowchartFeedMessageData;
    // Custom metadata attached to a feed.
    FeedMetadata: {
      title?: string; // Spreadsheet + Slideshow chats
      type?: "ai-comment-reply"; // Flowchart comment replies
      threadId?: string; // Flowchart
      commentId?: string; // Flowchart
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
    cursor: null, // Whiteboard + Slideshow
    presence: undefined, // Canvas
    selectedCells: null, // Spreadsheet
    promptingFeedId: null, // Spreadsheet + Slideshow
    cursorSlideId: null, // Slideshow
    selection: null, // Slideshow
  };
}

export function createInitialStorage(
  type?: DocumentType
): Liveblocks["Storage"] {
  // Spreadsheet documents start with an empty grid of stable row/column ids.
  const isSpreadsheet = type === "spreadsheet";

  return {
    notes: new LiveMap(), // Whiteboard
    records: new LiveMap(), // Canvas
    cover: null, // Note
    icon: null, // Note
    title: "", // Note
    // Spreadsheet
    rowIds: new LiveList(
      isSpreadsheet
        ? Array.from({ length: SPREADSHEET_DEFAULT_ROWS }, () => nanoid(8))
        : []
    ),
    colIds: new LiveList(
      isSpreadsheet
        ? Array.from({ length: SPREADSHEET_DEFAULT_COLS }, () => nanoid(8))
        : []
    ),
    cells: new LiveMap(),
    colWidths: new LiveMap(),
    rowHeights: new LiveMap(),
    // App
    code: "",
    // `flow` (Flowchart) is intentionally omitted: it is initialized lazily by
    // `useLiveblocksFlow` so its initial nodes/edges can be applied.
  };
}
