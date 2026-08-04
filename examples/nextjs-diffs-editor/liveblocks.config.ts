import type { LiveText } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    // Each user's current selection in the Diffs editor, stored as UTF-16 offsets.
    Presence: {
      selection: { anchor: number; focus: number } | null;
    };
    // The shared source file. Diffs owns rendering/edit UI; LiveText owns sync.
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
