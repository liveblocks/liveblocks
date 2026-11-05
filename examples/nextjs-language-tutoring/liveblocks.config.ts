import type {
  JsonObject,
  LiveFile,
  LiveFileData,
  LiveList,
  LiveMap,
  LiveObject,
  LsonObject,
} from "@liveblocks/client";
import type { LiveblocksProsemirrorNode } from "@liveblocks/prosemirror";

// Each lesson room holds several documents. A document is either a LiveText
// Tiptap document, a tldraw whiteboard, or a PDF annotated on top of tldraw.
export type DocumentType = "text" | "whiteboard" | "pdf";

export type DocumentData = {
  id: string;
  type: DocumentType;
  title: string;
  createdAt: number;
  createdBy: string;
  // Sidebar position. Missing on documents created before reordering, which
  // then sort newest-first by createdAt.
  order?: number;
  // Only set for PDF documents: the uploaded file
  pdf?: LiveFile;
  // Only set for PDF documents: number of pages, once known
  pageCount?: number;
};

// An edit the AI assistant made to a document, listed under its chat reply
export type AiAction = {
  docId: string;
  label: string;
};

declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    // Each user's Presence, shared with everyone in the room
    Presence: {
      // Which document the user is currently looking at
      docId: string | null;
      // tldraw's own presence record (cursor, selection, camera) for the
      // whiteboard the user is on
      tldraw: JsonObject | null;
    };

    // The room's Storage: the documents list plus the per-document data.
    Storage: {
      documents: LiveList<LiveObject<DocumentData>>;
      // Text documents, written by `@liveblocks/react-tiptap` in LiveText
      // mode (one ProseMirror tree per document, keyed by document id). The
      // AI assistant edits these from the server, see `lib/ai/text-doc.ts`.
      _tiptap_docs?: LiveMap<string, LiveblocksProsemirrorNode>;
      // One tldraw record map per whiteboard / PDF document
      whiteboards: LiveMap<
        string,
        LiveMap<string, LiveObject<LsonObject> | JsonObject>
      >;
      // Files uploaded through tldraw (images dropped on a whiteboard)
      files: LiveMap<string, LiveFile>;
      // PNG snapshots of documents shared into the chat
      snapshots: LiveMap<string, LiveFile>;
      // Files shared in the room chat. Created on first upload for older rooms.
      attachments?: LiveMap<string, LiveFile>;
      // Only present in the user-directory room (see `lib/liveblocks-server.ts`),
      // where profiles of Google users are kept, keyed by user id
      profiles?: LiveMap<string, LiveObject<Liveblocks["UserMeta"]["info"]>>;
    };

    // Room metadata, set server-side when creating rooms. Rooms have no
    // explicit name; they're titled after their members (see lib/room-title.ts)
    RoomInfo: {
      language: string;
      ownerId: string;
    };

    // Chat messages: regular text messages (from people or the AI
    // assistant), or snapshots of a document
    FeedMessageData:
      | {
          kind: "text";
          userId: string;
          content: string;
          // Files uploaded with the message. Bytes live in Storage.attachments.
          attachments?: {
            fileId: string;
            name: string;
            size: number;
            mimeType: string;
          }[];
          // Only on AI replies: true while the reply is being written
          streaming?: boolean;
          // Only on AI replies: what the assistant is doing right now
          status?: string;
          // Only on AI replies: the document edits it made
          actions?: AiAction[];
        }
      | {
          kind: "snapshot";
          userId: string;
          docId: string;
          docType: DocumentType;
          docTitle: string;
          // Which page was shared, for PDF documents
          page?: number;
          // PNG snapshot stored in `Storage.snapshots`, for canvases
          snapshotId?: string;
          width?: number;
          height?: number;
          // Frozen HTML, for text documents
          html?: string;
          caption?: string;
        };

    // Comments threads attached to text documents
    ThreadMetadata: {
      docId: string;
    };
  }
}

// Convenience aliases for the global types above
export type UserMeta = Liveblocks["UserMeta"];
export type UserInfo = Liveblocks["UserMeta"]["info"];
export type RoomInfo = Liveblocks["RoomInfo"];

// A document as read from Storage (immutable snapshot): `LiveFile` becomes
// plain `LiveFileData`, which `room.getFileUrl()` accepts as-is.
export type DocumentInfo = Omit<DocumentData, "pdf"> & { pdf?: LiveFileData };

export {};
