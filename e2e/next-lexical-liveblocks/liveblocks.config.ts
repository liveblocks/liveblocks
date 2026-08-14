import type { LiveLexicalSelection, LiveRootNode } from "@liveblocks/lexical";

declare global {
  interface Liveblocks {
    Presence: {
      selection: LiveLexicalSelection | null;
    };

    Storage: {
      document: LiveRootNode;
    };

    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        avatar: string;
      };
    };
  }
}

export {};
