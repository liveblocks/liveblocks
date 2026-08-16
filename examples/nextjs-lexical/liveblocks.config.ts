import type { LiveLexicalSelection, LiveRootNode } from "@liveblocks/lexical";

declare global {
  interface Liveblocks {
    // Presence: { selection: LiveLexicalSelection | null }
    Presence: {
      selection: LiveLexicalSelection | null;
    };

    // Storage: { document: LiveRootNode }
    Storage: {
      document: LiveRootNode;
    };

    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };
  }
}

export {};
