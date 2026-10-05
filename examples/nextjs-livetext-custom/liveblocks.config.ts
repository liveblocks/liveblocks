import type { LiveText } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    Presence: {
      selection: { anchor: number; focus: number } | null;
    };
    Storage: {
      text: LiveText;
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
