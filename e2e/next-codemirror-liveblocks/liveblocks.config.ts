import type { LiveblocksCodemirrorSelection } from "@liveblocks/codemirror";
import type { LiveText } from "@liveblocks/core";

declare global {
  interface Liveblocks {
    Presence: {
      selection: LiveblocksCodemirrorSelection | null;
    };

    Storage: {
      document: LiveText;
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
