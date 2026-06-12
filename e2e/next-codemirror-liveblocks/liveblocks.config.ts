import type { LiveText } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    Presence: {
      selection: { anchor: number; head: number; version: number } | null;
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
