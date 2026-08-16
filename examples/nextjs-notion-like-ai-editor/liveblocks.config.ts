import type { LiveLexicalSelection, LiveRootNode } from "@liveblocks/lexical";

declare global {
  interface Liveblocks {
    Presence: {
      selection: LiveLexicalSelection | null;
    };

    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    Storage: {
      title: string;
      document: LiveRootNode;
    };
  }
}

export {};
