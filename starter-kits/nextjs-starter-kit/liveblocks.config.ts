import { LiveMap, LiveObject } from "@liveblocks/client";
import { Document, User } from "./types";

export type Note = LiveObject<{
  x: number;
  y: number;
  text: string;
  selectedBy: Liveblocks["UserMeta"]["info"] | null;
  id: string;
}>;

export type Notes = LiveMap<string, Note>;

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      cursor: { x: number; y: number } | null;
    };
    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: {
      notes: Notes;
    };
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: Pick<User, "name" | "avatar" | "color">;
    };
    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent: {
      type: "SHARE_DIALOG_UPDATE";
    };
    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: {
      highlightId: string;
    };
    ActivitiesData: {
      $addedToDocument: {
        documentId: Document["id"];
      };
    };
  }
}
