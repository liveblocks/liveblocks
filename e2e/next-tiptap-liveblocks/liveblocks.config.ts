import type { Json } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    Presence: {
      liveblocksTiptap?: {
        field: string;
        anchor: number;
        head: number;
        user?: {
          name?: string;
          color?: string;
        };
      } | null;
    };

    Storage: {
      document?: Json;
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
