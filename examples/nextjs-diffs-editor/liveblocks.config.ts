import type { LiveMap, LiveText } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        // Example properties, for useSelf, useOthers, etc.
        name: string;
        avatar: string;
        color: string;
      };
    };

    // Realtime presence, shared with everyone in the room. Holds each user's
    // carets/selections so they can be drawn live in everyone else's editor.
    Presence: {
      selection: {
        // Path of the file the user is currently editing.
        file: string;
        // The LiveText version the offsets below were encoded against, so
        // receivers can rebase them onto their own (possibly newer) document.
        version: number;
        // One entry per caret (the editor supports multiple cursors).
        ranges: { anchor: number; head: number }[];
      } | null;
    };

    // Each file of the shared project is a LiveText document, keyed by path.
    Storage: {
      files: LiveMap<string, LiveText>;
    };
  }
}

export {};
