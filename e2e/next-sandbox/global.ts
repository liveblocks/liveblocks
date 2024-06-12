import type { LiveList } from "@liveblocks/core";

declare global {
  interface Liveblocks {
    Presence: {
      foo?: number;
    };

    Storage: {
      items?: LiveList<string>;
    };
  }
}
