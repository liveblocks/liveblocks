import type { LiveList } from "@liveblocks/core";

declare global {
  interface Liveblocks {
    Presence: {
      foo?: number;
    };

    Storage: {
      initialRoom?: string;
      items?: LiveList<string>;
    };
  }
}
