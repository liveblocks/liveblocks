export type AccurateCursorPositions = {
  cursorSelectors: string[];
  cursorX: number;
  cursorY: number;
};

export type DragOffset = {
  x: number;
  y: number;
};

declare global {
  interface Liveblocks {
    // Each user's Presence, for room.getPresence, room.subscribe("others"), etc.
    Presence: {
      cursor: AccurateCursorPositions | null;
      editingText: `${string}/${string}` | null;
    };
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: {
        name: string;
        color: string;
        avatar: string;
      }; // Accessible through `user.info`
    };
    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: {
      zIndex: number;
      cursorSelectors: string;
      cursorX: AccurateCursorPositions["cursorX"];
      cursorY: AccurateCursorPositions["cursorY"];
    };
  }
}
