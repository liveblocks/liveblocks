import type { LiveList } from "@liveblocks/client";
import type { Stroke } from "drawesome";
import type { DraftStroke } from "@/lib/strokes";

declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null;
      draft: DraftStroke | null;
    };

    Storage: {
      strokes: LiveList<Stroke>;
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
